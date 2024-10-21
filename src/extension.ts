import * as nls from 'vscode-nls';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

// 处理任务执行和调试器启动的主逻辑
async function handleTaskAndDebug(fileExtension: string, buildTaskLabel: string | undefined, debugConfigName: string) {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showErrorMessage(localize('error.noWorkspaceFolderOpen', 'No workspace folder is open.'));
		return;
	}

	// 如果提供了 buildTaskLabel，尝试执行构建任务
	if (buildTaskLabel) {
		const tasks = await vscode.tasks.fetchTasks();
		const buildTask = tasks.find(task => task.name === buildTaskLabel);
		if (buildTask) {
			// 执行构建任务
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
		}
		// 如果找不到 buildTaskLabel 或任务不存在，直接跳过任务执行
	}

	// 任务完成后或跳过后，启动调试器
	const configPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json');
	if (!fs.existsSync(configPath)) {
		vscode.window.showErrorMessage(localize('error.noLaunchConfigFound', 'No launch.json file found at {0}.', configPath));
		return;
	}
	const configContent = fs.readFileSync(configPath, 'utf8');
	const launchConfig = jsonc.parse(configContent);

	// 查找与 debugConfigName 匹配的调试配置
	const chosenConfig = launchConfig.configurations.find((config: any) => config.name === debugConfigName);
	if (chosenConfig) {
		// 启动调试器
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

	// 使用 getDebugConfigName 函数查找 XXX_Debug 配置的名称
	const debugConfigName = await getDebugConfigName(fileExtension);
	if (!debugConfigName) {
		// 如果没有找到 XXX_Debug 配置，则返回 undefined
		return undefined;
	}

	// 读取 launch.json 并找到与 debugConfigName 匹配的调试配置
	const launchConfigPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json');
	if (!fs.existsSync(launchConfigPath)) {
		vscode.window.showErrorMessage(localize('error.noLaunchConfigFound', 'No launch.json file found.'));
		return undefined;
	}
	const launchFileContent = fs.readFileSync(launchConfigPath, 'utf-8');
	const launchConfig = jsonc.parse(launchFileContent);

	// 找到与 debugConfigName 匹配的配置，并检查是否有 preLaunchTask
	const debugConfig = launchConfig.configurations.find((config: any) => config.name === debugConfigName);
	if (!debugConfig || !debugConfig.preLaunchTask) {
		// 如果没有找到对应的配置或没有 preLaunchTask 字段，返回 undefined
		return undefined;
	}

	const preLaunchTaskLabel = debugConfig.preLaunchTask;

	// 读取 tasks.json 并查找对应的任务标签
	const tasksConfigPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'tasks.json');
	if (!fs.existsSync(tasksConfigPath)) {
		vscode.window.showErrorMessage(localize('error.noTasksConfigFound', 'No tasks.json file found.'));
		return undefined;
	}

	const tasksFileContent = fs.readFileSync(tasksConfigPath, 'utf-8');
	const tasksConfig = jsonc.parse(tasksFileContent);

	// 在 tasks.json 中查找与 preLaunchTaskLabel 匹配的任务
	const buildTask = tasksConfig.tasks.find((task: any) => task.label === preLaunchTaskLabel);

	if (buildTask) {
		return buildTask.label;
	}

	return undefined; // 如果没有找到对应的任务标签，返回 undefined
}


async function getDebugConfigName(fileExtension: string): Promise<string | undefined> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showErrorMessage(localize('error.noWorkspaceFolderOpen', 'No workspace folder is open.'));
		return undefined;
	}

	// 获取用户自定义的后缀
	const config = vscode.workspace.getConfiguration('yourExtension');
	const debugSuffix = config.get<string>('customDebugSuffix', '_Debug');

	const launchConfigPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json');
	if (!fs.existsSync(launchConfigPath)) {
		vscode.window.showErrorMessage(localize('error.noLaunchConfigFound', 'No launch.json file found.'));
		return undefined;
	}
	const fileContent = fs.readFileSync(launchConfigPath, 'utf-8');
	const launchConfig = jsonc.parse(fileContent);

	// 使用自定义后缀查找调试配置
	const debugConfig = launchConfig.configurations.find((config: any) => config.name.endsWith(debugSuffix) && config.name.startsWith(fileExtension));

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

		// 如果找到了调试配置，无论是否有构建任务标签，都执行
		if (debugConfigName) {
			// 即使 buildTaskLabel 为 undefined，也可以继续进行调试
			await handleTaskAndDebug(fileExtension, buildTaskLabel, debugConfigName);
		} else {
			vscode.window.showErrorMessage(localize('error.noSuitableDebugConfig', 'No suitable debug configuration found for {0}.', fileExtension));
		}
	});

	context.subscriptions.push(disposable);
}


export function deactivate() { }
