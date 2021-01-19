const kCommandApplyTheme = 'applyTheme';
const kCommandSyncStyles = 'syncStyles';
const kStylesStorageKey = `yg_styles_key`;
const kDefaultStyleNamePattern = 'rootName/themeName/themeSubtype/constName'

async function main() {
    if (figma.command === kCommandApplyTheme) {
        // 1. Получить список объектов для перекраски
        const selectedObjects = figma.currentPage.selection;
        if (selectedObjects.length === 0) figma.closePlugin('Selection is empty');

        // 2. Получить константы стилей локальных + из либы
        const styles = await restoreStyles();

        // Хэш с ключами — id стиля, нужен чтобы найти стиль по его id у текущего объекта
        // TODO: stylesById нужны только чтобы получить имя, можно сразу сохранять хэш с соответсвием id и name
        let stylesById = {};
        // Хэш с ключами — name стиля, нужен чтобы найти пару к текущему стилю по новому имени name
        let stylesByName = {};

        styles.forEach(style => {
            stylesById[style.id] = style;

            // 2.1. Константы с одинаковым именем будут переопределены локальными
            stylesByName[style.name] = style;
        });

        // Обходим выбранные экраны
        for (const selectedObject of selectedObjects) {
            const themePath = selectedObject.name;
            // Валидация themePath в названии экрана
            if (!validateThemePath(themePath)) {
                const warnMsg = `Theme path is invalid: ${themePath}`;
                console.warn(warnMsg);
                figma.closePlugin(warnMsg);
                return;
            }
            // Получаем компоненты themePath
            const [themeTypes, themeName, themeVariant, themeConst] = parseThemePath(expandThemePath(themePath));

            // Текущий объект не имеет детей, пропускаем
            if (selectedObject.findAll === undefined) {
                console.warn('[Main] Skip empty object', selectedObject);
                continue;
            }

            // Объодим все объекты, включая экран
            const objects = [selectedObject, ...selectedObject.findAll()];
            for (let object of objects) {
                // Для каждого themeType, то есть для ColorTheme, EffectTheme, TextTheme
                for (const themeType of themeTypes) {
                    if (themeType === 'ColorTheme') {
                        // Пропускаем если объект не предназначен для отрисовки на канвасе
                        if (!isPaintableObject(object)) break;

                        // TODO: разобрать на отдельные случаи: к объекту не надо применять стиль, у объекта рандомный цвет, у объекта неверный themePath
                        const [isValidFill, isValidStroke] = validateObjectForColorTheme(object);

                        if (isValidFill) {
                            const objectStyle = stylesById[object.fillStyleId];
                            const isValidThemePath = validateThemePath(objectStyle.name);
                            if (isValidThemePath) {
                                const [objThemeType, objThemeName, objThemeVariant, objThemeConst] = parseThemePath(objectStyle.name);
                                const altObjectStyleThemePath = `${themeType}/${themeName}/${themeVariant}/${objThemeConst}`;
                                const altStyle = stylesByName[altObjectStyleThemePath];

                                if (altStyle === undefined) {
                                    console.warn(`[ColorTheme/Fill] Object '${object.name}', unknown theme: '${altObjectStyleThemePath}'`);
                                } else {
                                    // Применяем стиль 
                                    if (themeConst === '*') {
                                        object.fillStyleId = altStyle.id;
                                    } else if (themeConst === objThemeConst) {
                                        object.fillStyleId = altStyle.id;
                                    } else {
                                        console.warn(`[ColorTheme/Fill] Object '${object.name}', ignoring theme const: '${objThemeConst}'`);
                                    }
                                }
                            } else {
                                console.warn(`[ColorTheme/Fill] Object '${object.name}', unknown theme: '${objectStyle.name}'`);
                            }
                        } else {
                            console.warn(`[ColorTheme/Fill] Object '${object.name}' is using plain fill color`);
                        }

                        if (isValidStroke) {
                            const objectStyle = stylesById[object.strokeStyleId];
                            const isValidThemePath = validateThemePath(objectStyle.name);
                            if (isValidThemePath) {
                                const [objThemeType, objThemeName, objThemeVariant, objThemeConst] = parseThemePath(objectStyle.name);
                                console.log(`[ColorTheme/Stroke] ${object.name}, ${objectStyle.name}`);
                                const altObjectStyleThemePath = `${themeType}/${themeName}/${themeVariant}/${objThemeConst}`;
                                const altStyle = stylesByName[altObjectStyleThemePath];

                                if (altStyle === undefined) {
                                    console.warn(`[ColorTheme/Stroke] Object '${object.name}', unknown theme: '${altObjectStyleThemePath}'`);
                                } else {
                                    // Применяем стиль
                                    if (themeConst === '*') {
                                        object.strokeStyleId = altStyle.id;
                                    } else if (themeConst === objThemeConst) {
                                        object.strokeStyleId = altStyle.id;
                                    } else {
                                        console.warn(`[ColorTheme/Stroke] Object '${object.name}', ignoring theme const: '${objThemeConst}'`);
                                    }
                                }
                            } else {
                                console.warn(`[ColorTheme/Stroke] Object '${object.name}', unknown theme: '${objectStyle.name}'`);
                            }
                        } else {
                            console.warn(`[ColorTheme/Stroke] Object '${object.name}' is using plain stroke color`);
                        }
                    } else {
                        console.warn(`[Main] Unknown theme type: '${themeType}' in theme path '${themePath}'`);
                        // figma.closePlugin('Theme not applied, see log for erros.');
                    }
                }
            }
        }

        figma.closePlugin('Theme applied!');
    }

    if (figma.command === kCommandSyncStyles) {
        await storeStyles();
        figma.closePlugin("Styles updated.");
    }
}

/******* Theme Path ********/

const validateThemePath = (themePath) => {
    const themePathParts = themePath.split('/').map(elem => elem.trim()).filter(elem => elem !== '');
    const length = themePathParts.length;
    return length === 2 || length === 4;
}

const expandThemePath = (themePath) => {
    const themePathParts = themePath.split('/').map(elem => elem.trim()).filter(elem => elem !== '');
    const length = themePathParts.length;
    const expandedThemeType = 'ColorTheme,EffectTheme,TextTheme'

    // 2 элемента в themePath, например Pro/Day
    if (length == 2) {
        const [themeName, themeVariant] = themePathParts;
        return `${expandedThemeType}/${themeName}/${themeVariant}/*`;
    }
    
    // 4 элемента в themePath, например */Pro/Day/*
    const [themeTypes, themeName, themeVariant, themeConst] = themePathParts;

    // Раскрываем * для themeTypes
    if (themeTypes === '*') {
        return `${expandedThemeType}/${themeName}/${themeVariant}/${themeConst}`
    }
    
    // Раскрывать нечего, возвращаем оригинал
    return themePath;
}

const parseThemePath = (themePath) => {
    const themePathParts = themePath.split('/').map(elem => elem.trim()).filter(elem => elem !== '');
    const [themeTypes, themeName, themeVariant, themeConst] = themePathParts;
    const themeTypesParts = themeTypes.split(',').map(elem => elem.trim()).filter(elem => elem !== '');
    return [themeTypesParts, themeName, themeVariant, themeConst];
}

/******* Object ********/

const isPaintableObject = (object) => 
    object.fillStyleId !== undefined
    && object.strokeStyleId !== undefined
    && object.effectStyleId !== undefined;

const isTextObject = (object) => 
    isPaintableObject(object)
    && object.textStyleId !== undefined;

/******* Styles ********/

// TODO: Убрать повторение
const validateObjectForColorTheme = (object) => {
    let result = [true, true];

    // Есть рандомный fill и нет стиля, возвращаем с ошибкой
    if (object.fills.length > 0 && object.fillStyleId === '') result[0] = false; 
    // У объекта нет fill и нет стиля, пропускаем
    if (object.fills.length === 0 && object.fillStyleId === '') result[0] = false;
    
    // Есть рандомный fill и нет стиля, возвращаем с ошибкой
    if (object.strokes.length > 0 && object.strokeStyleId === '') result[1] = false; 
    // У объекта нет fill и нет стиля, пропускаем
    if (object.strokes.length === 0 && object.strokeStyleId === '') result[1] = false;

    return result;
}

/******* Storage ********/

const restoreStyles = async () => {
    const styleKeys = await figma
        .clientStorage.getAsync(kStylesStorageKey);

    let styles = [];
    for (const styleKey of styleKeys) {
        try {
            const style = await figma.importStyleByKeyAsync(styleKey);
            styles.push(style);
        } catch (e) {}
    }

    return [...styles, ...figma.getLocalPaintStyles()];
}

const storeStyles = async () => {
    const paintStyleKeys = figma.getLocalPaintStyles()
        .map((style) => style.key);

    // Удаляем предыдущие стили
    await figma.clientStorage.setAsync(kStylesStorageKey, null);

    await figma
        .clientStorage.setAsync(kStylesStorageKey, paintStyleKeys);
}

main();
