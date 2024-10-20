# Allergy_Select_launch.json

This extension is designed for users who frequently work with multiple programming languages and need a one-click solution (F5) to run `launch.json` configurations without manually selecting the launch configuration.

## Language Switch

- [English](https://github.com/Allergy527/Allergy-select-launch/blob/main/README.md)
- [简体中文](https://github.com/Allergy527/Allergy-select-launch/blob/main/README.zh-cn.md)

## Features

- One-click compile and run C++, Python, Rust, and other languages based on pre-configured `launch.json` and `tasks.json` files.
- Automatically detect and execute the appropriate debug task.
- Support all language

## Usage

1. Write the `name` or `label` fields in the `launch.json` and `tasks.json` files according to the format:(You are supposed to name them like `XXX_Debug` or `XXX_Build`)
    - Example `launch.json`:

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

    - Example `tasks.json`:

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

2. open a file such as `.rs`,`.cpp` and so on.
3. press`F5`to build and run.
