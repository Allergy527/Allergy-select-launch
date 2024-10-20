import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as nls from 'vscode-nls';
import * as jsonc from 'jsonc-parser';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

// 处理任务执行和调试器启动的主逻辑
async function handleTaskAndDebug(fileExtension: string, buildTaskLabel: string, debugConfigName: string) {
	const tasks = await vscode.tasks.fetchTasks();
	const buildTask = tasks.find(task => task.name === buildTaskLabel);
	if (!buildTask) {
		vscode.window.showErrorMessage(localize('error.buildTaskNotFound', "Build task '{0}' not found!", buildTaskLabel));
		return;
	}
	// 执行任务
	const taskExecution = await vscode.tasks.executeTask(buildTask);
	// 使用 Promise 监听任务完成事件
	await new Promise<void>((resolve) => {
		const disposable = vscode.tasks.onDidEndTaskProcess((event) => {
			if (event.execution === taskExecution) {
				disposable.dispose(); // 确保只监听一次
				resolve(); // 任务完成，继续
			}
		});
	});
	// 任务完成后，启动调试器
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showErrorMessage(localize('error.noWorkspaceFolderOpen', 'No workspace folder is open.'));
		return;
	}
	const configPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json');
	if (!fs.existsSync(configPath)) {
		vscode.window.showErrorMessage(localize('error.noLaunchConfigFound', 'No launch.json file found at {0}.', configPath));
		return;
	}
	const configContent = fs.readFileSync(configPath, 'utf8');
	const launchConfig = jsonc.parse(configContent);

	const chosenConfig = launchConfig.configurations.find((config: any) => config.name === debugConfigName);
	if (chosenConfig) {
		vscode.debug.startDebugging(undefined, chosenConfig);
	} else {
		vscode.window.showErrorMessage(localize('error.noSuitableConfig', 'No suitable configuration found for {0}.', fileExtension));
	}
}

async function getBuildTaskLabel(fileExtension: string): Promise<string | undefined> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showErrorMessage(localize('error.noWorkspaceFolderOpen', 'No workspace folder is open.'));
		return undefined;
	}

	const tasksConfigPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'tasks.json');
	if (!fs.existsSync(tasksConfigPath)) {
		vscode.window.showErrorMessage(localize('error.noTasksConfigFound', 'No tasks.json file found.'));
		return undefined;
	}

	const fileContent = fs.readFileSync(tasksConfigPath, 'utf-8');
	const tasksConfig = jsonc.parse(fileContent);

	const buildTask = tasksConfig.tasks.find((task: any) => task.label.endsWith('_Build') && task.label.startsWith(fileExtension));

	if (buildTask) {
		return buildTask.label;
	}

	return undefined;
}

async function getDebugConfigName(fileExtension: string): Promise<string | undefined> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showErrorMessage(localize('error.noWorkspaceFolderOpen', 'No workspace folder is open.'));
		return undefined;
	}

	const launchConfigPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json');
	if (!fs.existsSync(launchConfigPath)) {
		vscode.window.showErrorMessage(localize('error.noLaunchConfigFound', 'No launch.json file found.'));
		return undefined;
	}
	const fileContent = fs.readFileSync(launchConfigPath, 'utf-8');
	const launchConfig = jsonc.parse(fileContent);

	const debugConfig = launchConfig.configurations.find((config: any) => config.name.endsWith('_Debug') && config.name.startsWith(fileExtension));

	if (debugConfig) {
		return debugConfig.name;
	}

	return undefined;
}

// 主命令逻辑，调用任务和调试器
export async function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.runLaunchFile', async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage(localize('error.noFileOpen', 'No file open.'));
			return;
		}

		const fileExtension = editor.document.languageId;
		const buildTaskLabel = await getBuildTaskLabel(fileExtension);  // 动态获取 Build 任务
		const debugConfigName = await getDebugConfigName(fileExtension);  // 动态获取 Debug 配置

		if (buildTaskLabel && debugConfigName) {
			await handleTaskAndDebug(fileExtension, buildTaskLabel, debugConfigName);
		} else {
			vscode.window.showErrorMessage(localize('error.noSuitableBuildOrDebugConfig', 'No suitable build or debug configuration found for {0}.', fileExtension));
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }
