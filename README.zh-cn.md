# Allergy_Select_launch.json

> 这个文档有着多语言支持:

- [English](./README.md)
- [简体中文](./README.zh-cn.md)

这个扩展目的是为平日里有多语言刷题需求的用户实现F5一键运行launch.json而无需手动选择启动配置。

## 功能

- 根据写好的`launch.json`以及`tasks.json`一键编译运行 C++、Python、Rust 等代码
- 自动检测并执行合适的调试任务

## 使用方法

1. 按照格式书写`launch.json`以及`tasks.json`的`name`或`label`字段
    - 示例`launch.json`

    ```json
    {
      "version": "0.2.0",
      "configurations": [
        {
          "name": "python_Debug",
          "type": "debugpy",
          "request": "launch",
          "program": "${file}",
          "console": "integratedTerminal"
        },
        {
          "name": "rust_Debug",
          "type": "lldb",
          "request": "launch",
          "program": "${fileDirname}/../../target/debug/${fileBasenameNoExtension}",
          "args": [],
          "cwd": "${fileDirname}/..",
          "console": "externalTerminal",
          "preLaunchTask": "rust_Build"
        }
      ]
    }
    ```

    - 示例`tasks.json`:

    ```json
    {
      "version": "2.0.0",
      "tasks": [
        {
          "label": "rust_Build",
          "type": "cargo",
          "command": "build",
          "problemMatcher": [
            "$rustc"
          ],
          "group": "build",
          "options": {
            "cwd": "${fileDirname}/.."
          }
        },
        {
          "label": "python_Build",
          "type": "shell",
          "command": "echo",
          "args": [
            "Python does not require a build step."
          ],
          "problemMatcher": []
        }
      ]
    }
    ```

2. 打开一个支持的文件（如 `.cpp`, `.py`, `.rs`）。
3. 按下 `F5` 键运行。
