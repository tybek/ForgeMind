use serde::Serialize;
use std::collections::HashMap;
use std::ffi::OsString;
use std::io;
use std::path::{Component, Path, PathBuf};
use std::process::Command;

const RECENT_COMMIT_LIMIT: usize = 10;
const CHANGED_FILE_LIMIT: usize = 500;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RepositoryRealityStatus {
    Detected,
    NotRepository,
    GitUnavailable,
    InspectionFailed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryRealityResult {
    pub status: RepositoryRealityStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repository: Option<RepositorySnapshot>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositorySnapshot {
    pub branch: Option<String>,
    pub detached_head: bool,
    pub head: CommitSummary,
    pub working_tree: WorkingTreeState,
    pub changed_files: Vec<ChangedFile>,
    pub total_changed_files: usize,
    pub changed_files_truncated: bool,
    pub diff_stat: DiffStat,
    pub recent_commits: Vec<CommitSummary>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WorkingTreeState {
    Clean,
    Dirty,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitSummary {
    pub hash: String,
    pub short_hash: String,
    pub subject: String,
    pub author: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FileStatus {
    Added,
    Modified,
    Deleted,
    Renamed,
    Copied,
    TypeChanged,
    Untracked,
    Conflicted,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangedFile {
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous_path: Option<String>,
    pub status: FileStatus,
    pub staged: bool,
    pub unstaged: bool,
    pub untracked: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub staged_status: Option<FileStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unstaged_status: Option<FileStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diff_stat: Option<FileDiffStat>,
}

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffStat {
    pub files_changed: usize,
    pub insertions: u64,
    pub deletions: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiffStat {
    pub insertions: Option<u64>,
    pub deletions: Option<u64>,
    pub binary: bool,
}

struct GitOutput {
    success: bool,
    stdout: Vec<u8>,
}

trait GitRunner {
    fn run(&self, current_dir: &Path, args: &[OsString]) -> io::Result<GitOutput>;
}

struct SystemGitRunner;

impl GitRunner for SystemGitRunner {
    fn run(&self, current_dir: &Path, args: &[OsString]) -> io::Result<GitOutput> {
        let output = Command::new("git")
            .current_dir(current_dir)
            .arg("--no-pager")
            .arg("-c")
            .arg("core.fsmonitor=false")
            .args(args)
            .env("LC_ALL", "C")
            .env("GIT_OPTIONAL_LOCKS", "0")
            .output()?;
        Ok(GitOutput {
            success: output.status.success(),
            stdout: output.stdout,
        })
    }
}

#[derive(Debug)]
enum InspectError {
    GitUnavailable,
    NotRepository,
    CommandFailed,
    InvalidOutput,
}

pub fn inspect(workspace_root: &Path) -> RepositoryRealityResult {
    match inspect_with_runner(workspace_root, &SystemGitRunner) {
        Ok(repository) => RepositoryRealityResult {
            status: RepositoryRealityStatus::Detected,
            repository: Some(repository),
            message: None,
        },
        Err(InspectError::GitUnavailable) => unavailable(),
        Err(InspectError::NotRepository) => RepositoryRealityResult {
            status: RepositoryRealityStatus::NotRepository,
            repository: None,
            message: Some("The active ForgeMind workspace is not inside a Git repository.".to_owned()),
        },
        Err(InspectError::CommandFailed | InspectError::InvalidOutput) => failed(),
    }
}

pub fn inspection_failed() -> RepositoryRealityResult {
    failed()
}

fn unavailable() -> RepositoryRealityResult {
    RepositoryRealityResult {
        status: RepositoryRealityStatus::GitUnavailable,
        repository: None,
        message: Some("Git is not available on this system. The ForgeMind workspace remains usable.".to_owned()),
    }
}

fn failed() -> RepositoryRealityResult {
    RepositoryRealityResult {
        status: RepositoryRealityStatus::InspectionFailed,
        repository: None,
        message: Some("Repository Reality could not be inspected. The ForgeMind workspace remains usable.".to_owned()),
    }
}

fn inspect_with_runner(
    workspace_root: &Path,
    runner: &dyn GitRunner,
) -> Result<RepositorySnapshot, InspectError> {
    let root_output = run(runner, workspace_root, &["rev-parse", "--show-toplevel"])?;
    if !root_output.success {
        return Err(InspectError::NotRepository);
    }
    let repository_root = PathBuf::from(single_line(&root_output.stdout)?);

    let log_output = run(
        runner,
        &repository_root,
        &[
            "log",
            "-n",
            &RECENT_COMMIT_LIMIT.to_string(),
            "--format=%h%x1f%H%x1f%aI%x1f%an%x1f%s%x1e",
        ],
    )?;
    if !log_output.success {
        return Err(InspectError::CommandFailed);
    }
    let recent_commits = parse_commits(&log_output.stdout)?;
    let head = recent_commits.first().cloned().ok_or(InspectError::InvalidOutput)?;

    let branch_output = run(runner, &repository_root, &["rev-parse", "--abbrev-ref", "HEAD"])?;
    if !branch_output.success {
        return Err(InspectError::CommandFailed);
    }
    let branch_value = single_line(&branch_output.stdout)?;
    let detached_head = branch_value == "HEAD";
    let branch = (!detached_head).then_some(branch_value);

    let status_output = run(
        runner,
        &repository_root,
        &["status", "--porcelain=v1", "-z", "--untracked-files=all", "--renames"],
    )?;
    if !status_output.success {
        return Err(InspectError::CommandFailed);
    }
    let mut changed_files = parse_status(&status_output.stdout)?;
    let total_changed_files = changed_files.len();

    let diff_output = run(
        runner,
        &repository_root,
        &[
            "diff",
            "--no-ext-diff",
            "--no-textconv",
            "--numstat",
            "-z",
            "HEAD",
        ],
    )?;
    if !diff_output.success {
        return Err(InspectError::CommandFailed);
    }
    let (diff_stat, file_stats) = parse_numstat(&diff_output.stdout)?;
    for file in &mut changed_files {
        file.diff_stat = file_stats.get(&file.path).cloned();
    }
    changed_files.truncate(CHANGED_FILE_LIMIT);

    Ok(RepositorySnapshot {
        branch,
        detached_head,
        head,
        working_tree: if total_changed_files == 0 {
            WorkingTreeState::Clean
        } else {
            WorkingTreeState::Dirty
        },
        changed_files,
        total_changed_files,
        changed_files_truncated: total_changed_files > CHANGED_FILE_LIMIT,
        diff_stat,
        recent_commits,
    })
}

fn run(
    runner: &dyn GitRunner,
    current_dir: &Path,
    args: &[&str],
) -> Result<GitOutput, InspectError> {
    let args = args.iter().map(OsString::from).collect::<Vec<_>>();
    runner.run(current_dir, &args).map_err(|error| {
        if error.kind() == io::ErrorKind::NotFound {
            InspectError::GitUnavailable
        } else {
            InspectError::CommandFailed
        }
    })
}

fn single_line(bytes: &[u8]) -> Result<String, InspectError> {
    let value = std::str::from_utf8(bytes)
        .map_err(|_| InspectError::InvalidOutput)?
        .trim_end_matches(['\r', '\n'])
        .to_owned();
    if value.is_empty() {
        Err(InspectError::InvalidOutput)
    } else {
        Ok(value)
    }
}

fn parse_commits(bytes: &[u8]) -> Result<Vec<CommitSummary>, InspectError> {
    let text = std::str::from_utf8(bytes).map_err(|_| InspectError::InvalidOutput)?;
    text.split('\u{1e}')
        .map(|record| record.trim_matches(['\r', '\n']))
        .filter(|record| !record.is_empty())
        .map(|record| {
            let fields = record.split('\u{1f}').collect::<Vec<_>>();
            if fields.len() != 5 || fields[..4].iter().any(|field| field.is_empty()) {
                return Err(InspectError::InvalidOutput);
            }
            Ok(CommitSummary {
                short_hash: fields[0].to_owned(),
                hash: fields[1].to_owned(),
                timestamp: fields[2].to_owned(),
                author: fields[3].to_owned(),
                subject: if fields[4].is_empty() {
                    "(No commit subject)".to_owned()
                } else {
                    fields[4].to_owned()
                },
            })
        })
        .collect()
}

fn parse_status(bytes: &[u8]) -> Result<Vec<ChangedFile>, InspectError> {
    let records = bytes.split(|byte| *byte == 0).collect::<Vec<_>>();
    let mut changes = Vec::new();
    let mut index = 0;
    while index < records.len() {
        let record = records[index];
        if record.is_empty() {
            index += 1;
            continue;
        }
        if record.len() < 4 || record[2] != b' ' {
            return Err(InspectError::InvalidOutput);
        }
        let index_code = record[0] as char;
        let worktree_code = record[1] as char;
        let path = relative_path(&record[3..])?;
        let renamed_or_copied = matches!(index_code, 'R' | 'C') || matches!(worktree_code, 'R' | 'C');
        let previous_path = if renamed_or_copied {
            index += 1;
            let previous = records.get(index).ok_or(InspectError::InvalidOutput)?;
            Some(relative_path(previous)?)
        } else {
            None
        };
        let untracked = index_code == '?' && worktree_code == '?';
        let staged = !matches!(index_code, ' ' | '?' | '!');
        let unstaged = untracked || !matches!(worktree_code, ' ' | '?' | '!');
        let staged_status = staged.then(|| file_status(index_code));
        let unstaged_status = if untracked {
            Some(FileStatus::Untracked)
        } else {
            unstaged.then(|| file_status(worktree_code))
        };
        let status = overall_status(index_code, worktree_code, untracked);
        changes.push(ChangedFile {
            path,
            previous_path,
            status,
            staged,
            unstaged,
            untracked,
            staged_status,
            unstaged_status,
            diff_stat: None,
        });
        index += 1;
    }
    Ok(changes)
}

fn relative_path(bytes: &[u8]) -> Result<String, InspectError> {
    let value = std::str::from_utf8(bytes).map_err(|_| InspectError::InvalidOutput)?;
    let path = Path::new(value);
    if value.is_empty()
        || path.is_absolute()
        || path.components().any(|component| {
            matches!(component, Component::ParentDir | Component::RootDir | Component::Prefix(_))
        })
    {
        return Err(InspectError::InvalidOutput);
    }
    Ok(value.replace('\\', "/"))
}

fn overall_status(index: char, worktree: char, untracked: bool) -> FileStatus {
    if untracked {
        return FileStatus::Untracked;
    }
    if index == 'U'
        || worktree == 'U'
        || matches!((index, worktree), ('A', 'A') | ('D', 'D'))
    {
        return FileStatus::Conflicted;
    }
    for code in [index, worktree] {
        match code {
            'R' => return FileStatus::Renamed,
            'C' => return FileStatus::Copied,
            'D' => return FileStatus::Deleted,
            'A' => return FileStatus::Added,
            'T' => return FileStatus::TypeChanged,
            'M' => return FileStatus::Modified,
            _ => {}
        }
    }
    FileStatus::Unknown
}

fn file_status(code: char) -> FileStatus {
    match code {
        'A' => FileStatus::Added,
        'M' => FileStatus::Modified,
        'D' => FileStatus::Deleted,
        'R' => FileStatus::Renamed,
        'C' => FileStatus::Copied,
        'T' => FileStatus::TypeChanged,
        'U' => FileStatus::Conflicted,
        '?' => FileStatus::Untracked,
        _ => FileStatus::Unknown,
    }
}

fn parse_numstat(
    bytes: &[u8],
) -> Result<(DiffStat, HashMap<String, FileDiffStat>), InspectError> {
    let mut cursor = 0;
    let mut total = DiffStat::default();
    let mut by_path = HashMap::new();
    while cursor < bytes.len() {
        let additions = take_until(bytes, &mut cursor, b'\t')?;
        if additions.is_empty() && cursor >= bytes.len() {
            break;
        }
        let deletions = take_until(bytes, &mut cursor, b'\t')?;
        let path = if bytes.get(cursor) == Some(&0) {
            cursor += 1;
            let _previous_path = take_until(bytes, &mut cursor, 0)?;
            relative_path(take_until(bytes, &mut cursor, 0)?)?
        } else {
            relative_path(take_until(bytes, &mut cursor, 0)?)?
        };
        let additions = parse_stat_value(additions)?;
        let deletions = parse_stat_value(deletions)?;
        let binary = additions.is_none() || deletions.is_none();
        total.files_changed += 1;
        total.insertions += additions.unwrap_or(0);
        total.deletions += deletions.unwrap_or(0);
        by_path.insert(path, FileDiffStat { insertions: additions, deletions, binary });
    }
    Ok((total, by_path))
}

fn take_until<'a>(
    bytes: &'a [u8],
    cursor: &mut usize,
    delimiter: u8,
) -> Result<&'a [u8], InspectError> {
    let start = *cursor;
    let relative_end = bytes[start..]
        .iter()
        .position(|byte| *byte == delimiter)
        .ok_or(InspectError::InvalidOutput)?;
    let end = start + relative_end;
    *cursor = end + 1;
    Ok(&bytes[start..end])
}

fn parse_stat_value(bytes: &[u8]) -> Result<Option<u64>, InspectError> {
    if bytes == b"-" {
        return Ok(None);
    }
    let value = std::str::from_utf8(bytes).map_err(|_| InspectError::InvalidOutput)?;
    value.parse().map(Some).map_err(|_| InspectError::InvalidOutput)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::process::Stdio;
    use tempfile::TempDir;

    fn git(root: &Path, args: &[&str]) {
        let status = Command::new("git")
            .current_dir(root)
            .args(args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .expect("Git is required for repository fixture tests");
        assert!(status.success(), "git command failed: {args:?}");
    }

    fn repository() -> TempDir {
        let temp = tempfile::tempdir().unwrap();
        git(temp.path(), &["init", "--quiet"]);
        git(temp.path(), &["config", "user.name", "ForgeMind Test"]);
        git(temp.path(), &["config", "user.email", "test@forgemind.local"]);
        fs::write(temp.path().join("tracked.txt"), "first\n").unwrap();
        git(temp.path(), &["add", "tracked.txt"]);
        git(temp.path(), &["commit", "--quiet", "-m", "Initial reality"]);
        temp
    }

    fn detected(root: &Path) -> RepositorySnapshot {
        let result = inspect(root);
        assert_eq!(result.status, RepositoryRealityStatus::Detected);
        result.repository.unwrap()
    }

    #[test]
    fn reports_non_repository_without_breaking_the_workspace() {
        let temp = tempfile::tempdir().unwrap();
        let result = inspect(temp.path());
        assert_eq!(result.status, RepositoryRealityStatus::NotRepository);
        assert!(result.repository.is_none());
    }

    #[test]
    fn reads_branch_head_clean_tree_and_bounded_history() {
        let temp = repository();
        for index in 0..12 {
            fs::write(temp.path().join("tracked.txt"), format!("commit {index}\n")).unwrap();
            git(temp.path(), &["add", "tracked.txt"]);
            git(temp.path(), &["commit", "--quiet", "-m", &format!("Commit {index}")]);
        }
        let snapshot = detected(temp.path());
        assert!(snapshot.branch.is_some());
        assert!(!snapshot.detached_head);
        assert_eq!(snapshot.working_tree, WorkingTreeState::Clean);
        assert_eq!(snapshot.head.subject, "Commit 11");
        assert_eq!(snapshot.head.author, "ForgeMind Test");
        assert_eq!(snapshot.head.hash.len(), 40);
        assert!(snapshot.head.hash.starts_with(&snapshot.head.short_hash));
        assert_eq!(snapshot.recent_commits.len(), RECENT_COMMIT_LIMIT);
    }

    #[test]
    fn handles_detached_head() {
        let temp = repository();
        git(temp.path(), &["checkout", "--quiet", "--detach", "HEAD"]);
        let snapshot = detected(temp.path());
        assert!(snapshot.detached_head);
        assert_eq!(snapshot.branch, None);
    }

    #[test]
    fn distinguishes_modified_staged_unstaged_untracked_deleted_and_renamed_files() {
        let temp = repository();
        fs::write(temp.path().join("delete.txt"), "delete\n").unwrap();
        fs::write(temp.path().join("rename.txt"), "rename\n").unwrap();
        git(temp.path(), &["add", "delete.txt", "rename.txt"]);
        git(temp.path(), &["commit", "--quiet", "-m", "Add fixtures"]);

        fs::write(temp.path().join("tracked.txt"), "first\nstaged\n").unwrap();
        git(temp.path(), &["add", "tracked.txt"]);
        fs::write(temp.path().join("tracked.txt"), "first\nstaged\nunstaged\n").unwrap();
        fs::write(temp.path().join("added.txt"), "added\n").unwrap();
        git(temp.path(), &["add", "added.txt"]);
        fs::remove_file(temp.path().join("delete.txt")).unwrap();
        git(temp.path(), &["mv", "rename.txt", "renamed.txt"]);
        fs::write(temp.path().join("untracked.txt"), "new\n").unwrap();

        let snapshot = detected(temp.path());
        assert_eq!(snapshot.working_tree, WorkingTreeState::Dirty);
        let by_path = snapshot
            .changed_files
            .iter()
            .map(|file| (file.path.as_str(), file))
            .collect::<HashMap<_, _>>();
        let modified = by_path["tracked.txt"];
        assert_eq!(modified.status, FileStatus::Modified);
        assert!(modified.staged && modified.unstaged);
        assert!(modified.diff_stat.is_some());
        let deleted = by_path["delete.txt"];
        assert_eq!(deleted.status, FileStatus::Deleted);
        assert!(!deleted.staged && deleted.unstaged);
        let renamed = by_path["renamed.txt"];
        assert_eq!(renamed.status, FileStatus::Renamed);
        assert!(renamed.staged && !renamed.unstaged);
        assert_eq!(renamed.previous_path.as_deref(), Some("rename.txt"));
        let added = by_path["added.txt"];
        assert_eq!(added.status, FileStatus::Added);
        assert!(added.staged && !added.unstaged);
        let untracked = by_path["untracked.txt"];
        assert_eq!(untracked.status, FileStatus::Untracked);
        assert!(untracked.untracked && !untracked.staged && untracked.unstaged);
        assert!(snapshot.diff_stat.files_changed >= 3);
        assert!(snapshot.diff_stat.insertions >= 2);
        assert!(snapshot.diff_stat.deletions >= 1);
        assert!(snapshot.changed_files.iter().all(|file| !Path::new(&file.path).is_absolute()));
        assert!(snapshot.changed_files.iter().all(|file| !file.path.contains(&temp.path().display().to_string())));
    }

    struct UnavailableRunner;

    impl GitRunner for UnavailableRunner {
        fn run(&self, _current_dir: &Path, _args: &[OsString]) -> io::Result<GitOutput> {
            Err(io::Error::new(io::ErrorKind::NotFound, "git missing"))
        }
    }

    #[test]
    fn git_unavailable_is_a_safe_typed_state() {
        let error = inspect_with_runner(Path::new("workspace"), &UnavailableRunner).unwrap_err();
        assert!(matches!(error, InspectError::GitUnavailable));
        let result = unavailable();
        assert_eq!(result.status, RepositoryRealityStatus::GitUnavailable);
        assert!(result.message.unwrap().contains("remains usable"));
    }

    struct FailureRunner {
        calls: std::cell::RefCell<usize>,
    }

    impl GitRunner for FailureRunner {
        fn run(&self, _current_dir: &Path, args: &[OsString]) -> io::Result<GitOutput> {
            let mut calls = self.calls.borrow_mut();
            *calls += 1;
            if *calls == 1 {
                assert_eq!(args, &[OsString::from("rev-parse"), OsString::from("--show-toplevel")]);
                Ok(GitOutput { success: true, stdout: b"repo\n".to_vec() })
            } else {
                Ok(GitOutput { success: false, stdout: b"ignored".to_vec() })
            }
        }
    }

    #[test]
    fn command_failure_returns_no_process_output_or_path() {
        let runner = FailureRunner { calls: std::cell::RefCell::new(0) };
        let error = inspect_with_runner(Path::new("C:/secret/workspace-root"), &runner).unwrap_err();
        assert!(matches!(error, InspectError::CommandFailed));
        let serialized = serde_json::to_string(&failed()).unwrap();
        assert!(!serialized.contains("ignored"));
        assert!(!serialized.contains("workspace-root"));
    }

    #[test]
    fn rejects_absolute_or_parent_paths_from_git_output() {
        assert!(relative_path(b"../secret").is_err());
        assert!(relative_path(b"/secret").is_err());
        #[cfg(windows)]
        assert!(relative_path(br"C:\secret").is_err());
    }
}
