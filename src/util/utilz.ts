import * as path from 'path'
import * as fs from 'fs'
import { normalizePath } from './misc';

export function isInternalModel(settings) {
    // @ts-ignore
    //return settings.iaentitymodel.namespace === "iainternal" // TODO: make this better...
    return isPlayerModel(settings) // TODO: make this better...
}

export function isInternalPlayerModel(settings) {
    // @ts-ignore
    //return settings.iaentitymodel.namespace === "iainternal" && settings.iaentitymodel.projectName === "player" // TODO: make this better...
    return isPlayerModel(settings) // TODO: make this better...
}

export function isPlayerModel(settings) {
    // @ts-ignore
    //return settings.iaentitymodel.namespace === "iainternal" && settings.iaentitymodel.projectName === "player" // TODO: make this better...
    let res = false;
    Group.all.forEach((group) => {
		if(isInternalElement(group.name))
        {
            res = true;
            return;
        }
	})
    return res
}

export function needsToExportJsonsModels(settings) {
    // @ts-ignore
    return !isInternalModel(settings) || settings.iaentitymodel.addsAdditionalModels;
}

export function isInternalElement(name) {
    switch (name) {
        case "parm_left_3":
        case "parm_right_4":
        case "pbody_2":
        case "phead_0":
        case "pleg_left_1":
        case "pleg_right_5":
        case "sus_6":
            return true;
    }
    return false;
}

export function getCorrectInternalElementName(name) {
    return "_iainternal:entity/player/" + name;
}

export function getProjectFolder() {
    let fileName = Project.save_path.replace(/\\/g, '/').split('/').pop()
    let dirPath = Project.save_path.slice(0, -fileName.length - 1)

    return path.normalize(dirPath)
}

export function getProjectRootFolder() {
    let fileName = Project.save_path.replace(/\\/g, '/').split('/').pop()
    let dirPath = Project.save_path.slice(0, -fileName.length - 1)

    return path.normalize(dirPath)
}

function shouldExportIntoAssets(projectRoot: string) {
    return fs.existsSync(path.join(projectRoot, 'assets'))
}

export function getModelExportFolder(settings) {
    const projectRoot = getProjectRootFolder()
    const folderParts = shouldExportIntoAssets(projectRoot)
        ? [projectRoot, "assets", settings.iaentitymodel.namespace, "models", "entity", settings.iaentitymodel.projectName]
        : [projectRoot, "models", "entity", settings.iaentitymodel.projectName]

    const modelsPath = normalizePath(path.join(...folderParts))

    // Dirty way
    //if(!isInternalModel(settings)) {
        fs.mkdirSync(modelsPath, {recursive: true})
    //}

    return modelsPath
}

export function getTexturesExportFolder(settings) {
    const projectRoot = getProjectRootFolder()
    const folderParts = shouldExportIntoAssets(projectRoot)
        ? [projectRoot, "assets", settings.iaentitymodel.namespace, "textures", "entity", settings.iaentitymodel.projectName]
        : [projectRoot, "textures", "entity", settings.iaentitymodel.projectName]

    const texturesPath = normalizePath(path.join(...folderParts))

    // Dirty way
    //if(!isInternalModel(settings)) {
        fs.mkdirSync(texturesPath, {recursive: true})
    //}

    return texturesPath
}

export function fixMinecraftTexturesReferences() {
    Texture.all.forEach((t : Texture) => {
        // Make sure if a texture is a Minecraft texture it does get marked as it, to avoid exporting it later.
        // @ts-ignore
        let tmpPath = t.path.replaceAll("\\", "/");
        let texturesPartialPath = "/assets/minecraft/textures/";
        if(tmpPath.includes(texturesPartialPath)) {
            // @ts-ignore
            t.namespace = "minecraft";
            // @ts-ignore
            t.folder = tmpPath.split(texturesPartialPath)[1].split("/")[0];
        } else {
            // @ts-ignore
            if(t.namespace === "minecraft") {
                // @ts-ignore
                t.namespace = "";
                // @ts-ignore
                t.folder = "";
            }
        }
    })
}

export function getProjectSaveFolder() {
    let fileName = Project.save_path.replace(/\\/g, '/').split('/').pop()
    let dirPath = Project.save_path.slice(0, -fileName.length)

	return dirPath = normalizePath(dirPath);
}

export function refreshGroupsProperties() {
    // If any project is opened
    if(Project) {
        for (const [groupName, group] of Object.entries(Project.groups)) {

            if(group["boneType"] === "head")
                group["icon"] = "fa fa-smile"
            else if(group["boneType"] === "leftHandPivot")
                group["icon"] = "fa fa-hand-point-left"
            else if(group["boneType"] === "hatPivot")
                group["icon"] = "fa fa-hat-wizard"
            else if(group["boneType"] === "rightHandPivot")
                group["icon"] = "fa fa-hand-point-right"
            else if(group["boneType"] === "mount")
                group["icon"] = "fa fa-chair"
            else if(group["boneType"] === "locator")
                group["icon"] = "fa fa-anchor"
            else if(group["boneType"] === "hitbox")
                group["icon"] = "fa fa-square-full"
            else if(group.parent["name"] === undefined) // Root element
                group["icon"] = "fa fa-archive"
            else
                group["icon"] = "fa fa-bone"

            // Rename to lowercase each group name.
            // Transform from "GroupName" to "group_name" (snake case)
            let newName = group["name"].replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
            if(newName !== group["name"]) {
                group["name"] = newName;
            }

            group.updateElement()
        }
    }

    //if(Project.groups.length > 0)
    //    Project.groups[0]["icon"] = "fa fa-archive" // Root element
}

export function toJson(object: any) : string {
    // @ts-ignore
    return compileJSON(object, {small: true})
}