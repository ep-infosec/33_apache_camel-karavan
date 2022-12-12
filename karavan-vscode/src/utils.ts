/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as path from "path";
import { workspace, Uri, window, ExtensionContext, FileType } from "vscode";
import { CamelDefinitionYaml } from "core/api/CamelDefinitionYaml";

export function getRoot(): string | undefined {
    return (workspace.workspaceFolders && (workspace.workspaceFolders.length > 0))
        ? workspace.workspaceFolders[0].uri.fsPath : undefined;
}

export function save(relativePath: string, text: string) {
    if (workspace.workspaceFolders) {
        const uriFolder: Uri = workspace.workspaceFolders[0].uri;
        write(path.join(uriFolder.path, relativePath), text);
    }
}

export function saveCode(name: string, yamlFullPath: string, yamFileName: string, code: string) {
    if (workspace.workspaceFolders) {
        const folder = yamlFullPath.replace(yamFileName, '');
        write(path.join(folder, name + ".java"), code);
    }
}

export function deleteFile(fullPath: string) {
    if (workspace.workspaceFolders) {
        const uriFile: Uri = Uri.file(path.resolve(fullPath));
        workspace.fs.delete(uriFile);
    }
}

export function getRalativePath(fullPath: string): string {
    const root = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.path : "";
    const normalizedRoot = Uri.file(root).fsPath;
    const relativePath = path.resolve(fullPath).replace(normalizedRoot + path.sep, '');
    return relativePath;
}

export async function readKamelets(context: ExtensionContext) {
    const yamls: string[] = await readBuildInKamelets(context);
    const kameletsPath: string | undefined = workspace.getConfiguration().get("Karavan.kameletsPath");
    if (kameletsPath && kameletsPath.trim().length > 0) {
        const kameletsDir = path.isAbsolute(kameletsPath) ? kameletsPath : path.resolve(kameletsPath);
        const files = await readFilesInDirByExtension(kameletsDir, "yaml");
        const customKamelets: string[] = Array.from(files.values());
        if (customKamelets && customKamelets.length > 0) yamls.push(...customKamelets);
    }
    return yamls;
}

async function readBuildInKamelets(context: ExtensionContext) {
    const kameletsPath = path.join(context.extensionPath, 'kamelets', "kamelets.yaml");
    const result: string[] = [];
    const file = await readFile(kameletsPath);
    const code = Buffer.from(file).toString('utf8');
    code.split("\n---\n").map(c => c.trim()).forEach(z => result.push(z));
    return result;
}

async function readFilesInDirByExtension(dir: string, extension: string): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const dirs: [string, FileType][] = await readDirectory(dir);
    for (let d in dirs) {
        const filename = dirs[d][0];
        if (filename !== undefined && filename.endsWith(extension)) {
            const file = await readFile(dir + "/" + filename);
            const code = Buffer.from(file).toString('utf8');
            result.set(filename, code);
        }
    }
    return result;
}

export async function readComponents(context: ExtensionContext) {
    const componentsPath = path.join(context.extensionPath, 'components', 'components.json');
    const file = await readFile(componentsPath);
    const code = Buffer.from(file).toString('utf8');
    const components: [] = JSON.parse(code);
    const jsons: string[] = [];
    components.forEach(c => jsons.push(JSON.stringify(c)));
    return jsons;
}

export async function readTemplates(context: ExtensionContext) {
    const result = new Map<string, string>();
    const runtime = await getRuntime();
    const files = await readFilesInDirByExtension(path.join(context.extensionPath, 'snippets'), "java");
    files.forEach((v, k) => {
        if (runtime && k.startsWith(runtime)) {
            const name = k.replace(runtime + "-", "").replace(".java", "");
            result.set(name, v);
        }
    })
    return result;
}

export async function readJavaCode(fullPath: string) {
    const result = new Map<string, string>();
    const codePath = path.dirname(fullPath);
    const javaFiles = await getJavaFiles(codePath);
    for (let x in javaFiles) {
        const fname = javaFiles[x];
        const readData = await readFile(fname);
        const code = Buffer.from(readData).toString('utf8');
        result.set(path.basename(fname, ".java"), code);
    }
    return result;
}

export function parceYaml(filename: string, yaml: string): [boolean, string?] {
    const i = CamelDefinitionYaml.yamlToIntegration(filename, yaml);
    if (i.kind === 'Integration' && i.metadata.name) {
        return [true, yaml];
    } else {
        return [false, undefined];
    }
}

export function toCliFilename(filename: string): string {
    return (/\s/).test(filename)
        ? '"' + filename + '"'
        : filename.replace(/\s/g, "\\ ");
}

export function nameFromTitle(title: string): string {
    return title.replace(/[^a-z0-9+]+/gi, "-").toLowerCase();
}

export async function getAllFiles(dirPath, arrayOfFiles: string[]) {
    const files = await readDirectory(dirPath)

    arrayOfFiles = arrayOfFiles || [];

    for (let x in files) {
        const filename = files[x][0];
        const type = files[x][1];
        if (type === FileType.Directory) {
            arrayOfFiles = await getAllFiles(dirPath + "/" + filename, arrayOfFiles)
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", filename))
        }
    }
    return arrayOfFiles
}

export async function getYamlFiles(baseDir: string) {
    const result: string[] = [];
    (await getAllFiles(baseDir, [])).filter(f => f.endsWith(".yaml")).forEach(f => {
        result.push(f);
    })
    return result;
}

export async function hasApplicationProperties(baseDir: string) {
    return (await getPropertyFiles(baseDir)).includes(baseDir + path.sep + 'application.properties');
}

export async function getPropertyFiles(baseDir: string) {
    const result: string[] = [];
    (await getAllFiles(baseDir, [])).filter(f => f.endsWith(".properties")).forEach(f => {
        result.push(f);
    })
    return result;
}

export async function getJavaFiles(baseDir: string) {
    const result: string[] = [];
    (await getAllFiles(baseDir, [])).filter(f => f.endsWith(".java")).forEach(f => {
        result.push(f);
    })
    return result;
}

export async function getJsonFiles(baseDir: string) {
    const result: string[] = [];
    (await getAllFiles(baseDir, [])).filter(f => f.endsWith(".json")).forEach(f => {
        result.push(f);
    })
    return result;
}

export async function getIntegrationFiles(baseDir: string) {
    const result: string[] = []
    const files = await getYamlFiles(baseDir);
    for (let x in files) {
        const filename = files[x];
        const readData = await readFile(path.resolve(filename));
        const yaml = Buffer.from(readData).toString('utf8');
        if (!filename.startsWith(baseDir + path.sep + "target") && CamelDefinitionYaml.yamlIsIntegration(yaml)) {
            result.push(yaml);
        }
    }
    return result;
}


export async function getProperties(rootPath?: string) {
    try {
        if (rootPath === undefined)
            rootPath = (workspace.workspaceFolders && (workspace.workspaceFolders.length > 0)) ? workspace.workspaceFolders[0].uri.fsPath : undefined;
        if (rootPath) {
            const readData = await readFile(path.resolve(rootPath, "application.properties"));
            return Buffer.from(readData).toString('utf8');

        } else {
            const readData = await readFile(path.resolve("application.properties"));
            return Buffer.from(readData).toString('utf8');
        }
    } catch (err) {
        return '';
    }
}

export async function getProperty(name: string) {
    const properties = await getProperties();
    const props = properties.split("\n");
    for (var p of props) {
        const pair = p.split("=");
        if (pair[0] === name) {
            return pair[1];
        }
    }
}

export async function getRuntime() {
    const defaultRuntime: string = workspace.getConfiguration().get("camel.runtimes") || "";
    const runtime = await getProperty("camel.jbang.runtime");
    const result:string = runtime !== undefined ? runtime : defaultRuntime;
    return result;
}

export async function getTarget() {
    return getProperty('camel.karavan.target');
}

export async function getExportFolder() {
    return getProperty('camel.jbang.exportDir');
}

export async function stat(fullPath: string) {
    const uriFile: Uri = Uri.file(fullPath);
    return workspace.fs.stat(uriFile);
}

export async function readDirectory(fullPath: string) {
    const uriFile: Uri = Uri.file(fullPath);
    return workspace.fs.readDirectory(uriFile);
}

export async function readFile(fullPath: string) {
    const uriFile: Uri = Uri.file(fullPath);
    return workspace.fs.readFile(uriFile);
}

export async function write(fullPath: string, code: string) {
    const uriFile: Uri = Uri.file(fullPath);
    workspace.fs.writeFile(uriFile, Buffer.from(code, 'utf8'))
        .then(
            value => { },
            reason => window.showErrorMessage("Error: " + reason)
        );
}

export function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function defaultGAV(): string | undefined {
    const groupId = workspace.getConfiguration().get("Karavan.defaultGroupId");
    const artifact = currentFolderName();
    return groupId + ":" + artifact + ":1";
}

export function currentFolderName(): string | undefined {
    if (workspace.workspaceFolders) {
        const uriFolder: Uri = workspace.workspaceFolders[0].uri;
        const parts = uriFolder.fsPath.split(path.sep);
        const name = parts.at(parts.length - 1) || '';
        return name;
    }
}

export async function createApplicationproperties(runtime: string, gav: string, target: string) {
    if (workspace.workspaceFolders) {
        const uriFolder: Uri = workspace.workspaceFolders[0].uri;
        const name = currentFolderName() || "";

        const props: string[] = workspace.getConfiguration().get("Karavan.applicationProperties") || [];
        const runtimeProps: string[] = workspace.getConfiguration().get("Karavan.".concat(runtime.replaceAll("-", "")).concat(capitalize(target)).concat("Properties")) || [];

        const text = props.concat(runtimeProps).map(v => {
            if (v.includes('$NAME')) return v.replace('$NAME', name)
            else if (v.includes('$GAV')) return v.replace('$GAV', gav)
            else if (v.includes('$RUNTIME')) return v.replace('$RUNTIME', runtime)
            else if (v.includes('$TARGET')) return v.replace('$TARGET', target)
            else return v;
        }).join('\n');
        write(path.join(uriFolder.path, "application.properties"), text);
    }
}