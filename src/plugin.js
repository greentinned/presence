const kCommandApplyTheme = 'applyTheme';
const kCommandSyncStyles = 'syncStyles';
const kStylesStorageKey = `yg_styles_key`;
const kDefaultStyleNamePattern = 'rootName/themeName/themeSubtype/constName'

figma.ui.onmessage = msg => {
    if (msg.type === 'debugger') {
        const node = figma.getNodeById(msg.id);
        figma.currentPage.selection = [node]
        figma.viewport.scrollAndZoomIntoView([node]);
    }
}

async function main() {
    figma.showUI(__html__);

    if (figma.command === kCommandApplyTheme) {
        // Messages
        let unknownThemeErrors = [];
        let ignoringThemeConstErrors = [];
        let plainColorErrors = [];

        // 1. Получить список объектов для перекраски
        const selectedObjects = figma.currentPage.selection;
        if (selectedObjects.length === 0) figma.closePlugin('🌔 Selection is empty');

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

        console.log(stylesByName)

        // Обходим выбранные экраны
        for (const selectedObject of selectedObjects) {
            const themePath = selectedObject.name;
            // Валидация themePath в названии экрана
            if (!validateThemePath(themePath)) {
                const warnMsg = `🌕 Theme path is invalid: ${themePath}`;
                console.warn(warnMsg);
                figma.closePlugin(warnMsg);
                return;
            }
            // Получаем компоненты themePath
            const [themeTypes, themeName, themeVariant, themeConst] = parseThemePath(expandThemePath(themePath));
            console.log(themeTypes, themeName, themeVariant, themeConst)

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

                        var { isPlainColor, shouldSkip } = validateFillForColorTheme(object);
                        if (!shouldSkip) {
                            const objectStyle = stylesById[object.fillStyleId];

                            // Бывает отваливаются константы у фигмы, fillStyleId остался у object, но не попал в stylesById, поэтому нужна такая проверка
                            if (objectStyle === undefined) {
                                pushError(unknownThemeErrors, object, `Unknown <b>fillStyleId</b> for object <b>${object.name}</b>. Probably imported form deleted library`);
                                continue;
                            }

                            const isValidThemePath = validateThemePath(objectStyle.name);
                            if (isValidThemePath) {
                                // TODO: кажется parseThemePath нужна возможность сравнения с шаблоном (themePath экрана)
                                // будет возвращать скомпилированный из кусков путь, например
                                // ColorTheme/*/Day/* + ColorTheme/Pro/Day/* (путь из имени константы) = ColorTheme/Pro/Day/*
                                const [objThemeType, objThemeName, objThemeVariant, objThemeConst] = parseThemePath(objectStyle.name);
                                const altObjectStyleThemePath = `${themeType}/${themeName}/${themeVariant}/${objThemeConst}`;
                                const altStyle = stylesByName[altObjectStyleThemePath];

                                if (altStyle === undefined) {
                                    pushError(unknownThemeErrors, object, `Unknown theme <b>${altObjectStyleThemePath}</b> for object <b>${object.name}</b>`);
                                } else {
                                    // Применяем стиль 
                                    if (themeConst === '*') {
                                        object.fillStyleId = altStyle.id;
                                    } else if (themeConst === objThemeConst) {
                                        object.fillStyleId = altStyle.id;
                                    } else {
                                        pushError(ignoringThemeConstErrors, object, `Unknown theme const <b>${themeCons}</b> for object <b>${object.name}</b>`);
                                    }
                                }
                            } else {
                                pushError(unknownThemeErrors, object, `Skipping theme <b>${objectStyle.name}</b> for object <b>${object.name}</b>`, 'warning');
                            }
                        } else if (isPlainColor) {
                            pushError(plainColorErrors, object, `Plain <b>fill</b> color used for object <b>${object.name}</b>`);
                        }

                        var { isPlainColor, shouldSkip } = validateStrokeForColorTheme(object);
                        if (!shouldSkip) {
                            const objectStyle = stylesById[object.strokeStyleId];

                            // Бывает отваливаются константы у фигмы, strokeStyleId остался у object, но не попал в stylesById, поэтому нужна такая проверка
                            if (objectStyle === undefined) {
                                pushError(unknownThemeErrors, object, `Unknown <b>strokeStyleId</b> for object <b>${object.name}</b>. Probably imported form old library`);
                                continue;
                            }

                            const isValidThemePath = validateThemePath(objectStyle.name);
                            if (isValidThemePath) {
                                const [objThemeType, objThemeName, objThemeVariant, objThemeConst] = parseThemePath(objectStyle.name);
                                const altObjectStyleThemePath = `${themeType}/${themeName}/${themeVariant}/${objThemeConst}`;
                                const altStyle = stylesByName[altObjectStyleThemePath];

                                if (altStyle === undefined) {
                                    pushError(unknownThemeErrors, object, `Unknown theme <b>${altObjectStyleThemePath}</b> for object <b>${object.name}</b>`);
                                } else {
                                    // Применяем стиль
                                    if (themeConst === '*') {
                                        object.strokeStyleId = altStyle.id;
                                    } else if (themeConst === objThemeConst) {
                                        object.strokeStyleId = altStyle.id;
                                    } else {
                                        pushError(ignoringThemeConstErrors, object, `Unknown theme const <b>${themeCons}</b> for object <b>${object.name}</b>`);
                                    }
                                }
                            } else {
                                pushError(unknownThemeErrors, object, `Skipping theme <b>${objectStyle.name}</b> for object <b>${object.name}</b>`, 'warning');
                            }
                        } else if (isPlainColor) {
                            pushError(plainColorErrors, object, `Plain <b>stroke</b> color used for object <b>${object.name}</b>`);
                        }
                    } else if (themeType === 'EffectTheme') {
                        // Пропускаем если объект не предназначен для отрисовки на канвасе
                        if (!isPaintableObject(object)) break;

                        var { isPlainEffect, shouldSkip } = validateEffectForColorTheme(object);
                        if (!shouldSkip) {
                            const objectStyle = stylesById[object.effectStyleId];

                            // Бывает отваливаются константы у фигмы, effectStyleId остался у object, но не попал в stylesById, поэтому нужна такая проверка
                            if (objectStyle === undefined) {
                                pushError(unknownThemeErrors, object, `Unknown <b>effectStyleId</b> for object <b>${object.name}</b>. Probably imported form deleted library`);
                                continue;
                            }

                            const isValidThemePath = validateThemePath(objectStyle.name);
                            if (isValidThemePath) {
                                const [objThemeType, objThemeName, objThemeVariant, objThemeConst] = parseThemePath(objectStyle.name);
                                const altObjectStyleThemePath = `${themeType}/${themeName}/${themeVariant}/${objThemeConst}`;
                                const altStyle = stylesByName[altObjectStyleThemePath];

                                if (altStyle === undefined) {
                                    pushError(unknownThemeErrors, object, `Unknown theme <b>${altObjectStyleThemePath}</b> for object <b>${object.name}</b>`);
                                } else {
                                    // Применяем стиль 
                                    if (themeConst === '*') {
                                        object.effectStyleId = altStyle.id;
                                    } else if (themeConst === objThemeConst) {
                                        object.effectStyleId = altStyle.id;
                                    } else {
                                        pushError(ignoringThemeConstErrors, object, `Unknown theme const <b>${themeCons}</b> for object <b>${object.name}</b>`);
                                    }
                                }
                            } else {
                                pushError(unknownThemeErrors, object, `Skipping theme <b>${objectStyle.name}</b> for object <b>${object.name}</b>`, 'warning');
                            }
                        } else if (isPlainEffect) {
                            pushError(plainColorErrors, object, `Plain <b>effect</b> used for object <b>${object.name}</b>`);
                        }
                    } else if (themeType === 'TextTheme') {
                        // Пропускаем если объект не предназначен для отрисовки на канвасе
                        if (!isTextObject(object)) break;

                        var { isPlainText, shouldSkip } = validateTextForColorTheme(object);
                        if (!shouldSkip) {
                            const objectStyle = stylesById[object.textStyleId];

                            // Бывает отваливаются константы у фигмы, effectStyleId остался у object, но не попал в stylesById, поэтому нужна такая проверка
                            if (objectStyle === undefined) {
                                pushError(unknownThemeErrors, object, `Unknown <b>textStyleId</b> for object <b>${object.name}</b>. Probably imported form deleted library`);
                                continue;
                            }

                            const isValidThemePath = validateThemePath(objectStyle.name);
                            if (isValidThemePath) {
                                // TODO: поправить эту кашу 1
                                const [, textThemeName, ,] = parseThemePath(expandThemePath(themePath), true);
                                const [, objThemeName, objThemeVariant, objThemeConst] = parseThemePath(objectStyle.name, true);
                                // TODO: поправить эту кашу 2
                                const altObjectStyleThemePath = `${themeType}/${textThemeName.includes('_') ? textThemeName : objThemeName}/${objThemeVariant}/${objThemeConst}`;
                                const altStyle = stylesByName[altObjectStyleThemePath];

                                if (altStyle === undefined) {
                                    pushError(unknownThemeErrors, object, `Unknown theme <b>${altObjectStyleThemePath}</b> for object <b>${object.name}</b>`);
                                } else {
                                    // Применяем стиль 
                                    if (themeConst === '*') {
                                        object.textStyleId = altStyle.id;
                                    } else if (themeConst === objThemeConst) {
                                        object.textStyleId = altStyle.id;
                                    } else {
                                        pushError(ignoringThemeConstErrors, object, `Unknown theme const <b>${themeCons}</b> for object <b>${object.name}</b>`);
                                    }
                                }
                            } else {
                                pushError(unknownThemeErrors, object, `Skipping theme <b>${objectStyle.name}</b> for object <b>${object.name}</b>`, 'warning');
                            }
                        } else if (isPlainText) {
                            pushError(plainColorErrors, object, `Plain <b>text style</b> used for object <b>${object.name}</b>`);
                        }
                    } else {
                        pushError(unknownThemeErrors, object, `Unknown themeType <b>${themeType}</b> for themePath <b>${themePath}</b>`);
                    }
                }
            }
        }

        figma.ui.postMessage([...unknownThemeErrors, ...ignoringThemeConstErrors, ...plainColorErrors]);
    }

    if (figma.command === kCommandSyncStyles) {
        await storeStyles();
        figma.closePlugin("🌘 Styles updated.");
    }
}

/******* Theme Path ********/

const validateThemePath = (themePath) => {
    const themePathParts = themePath.split('/').map(elem => elem.trim()).filter(elem => elem !== '');
    const length = themePathParts.length;
    return length === 2 || length === 4;
}

const expandThemePath = (rawThemePath) => {
    let themePath = rawThemePath;

    const themePathMatch = rawThemePath.match(/\((.+?)\)/);
    if (themePathMatch != null) themePath = themePathMatch[1];
    console.log(themePath)

    const themePathParts = themePath.split('/').map(elem => elem.trim()).filter(elem => elem !== '');
    const length = themePathParts.length;
    const expandedThemeType = 'ColorTheme,EffectTheme,TextTheme'

    // 2 элемента в themePath, например Pro/Day
    if (length == 2) {
        const [themeName, themeVariant] = themePathParts;
        console.log(`${expandedThemeType}/${themeName}/${themeVariant}/*`)
        return `${expandedThemeType}/${themeName}/${themeVariant}/*`;
    }

    // 4 элемента в themePath, например */Pro/Day/*
    const [themeTypes, themeName, themeVariant, themeConst] = themePathParts;

    // Раскрываем * для themeTypes
    if (themeTypes === '*') {
        console.log(`${expandedThemeType}/${themeName}/${themeVariant}/${themeConst}`)
        return `${expandedThemeType}/${themeName}/${themeVariant}/${themeConst}`;
    }

    console.log(themePath)

    // Раскрывать нечего, возвращаем оригинал
    return themePath;
}

const parseThemePath = (themePath, isTextThemePath = false) => {
    const themePathParts = themePath.split('/').map(elem => elem.trim()).filter(elem => elem !== '');
    const [themeTypes, themeName, themeVariant, themeConst] = themePathParts;
    const themeTypesParts = themeTypes.split(',').map(elem => elem.trim()).filter(elem => elem !== '');
    const themeNameParts = isTextThemePath ? themeName : themeName.replace(/_.+/, '');
    return [themeTypesParts, themeNameParts, themeVariant, themeConst];
}

/******* Object ********/

const isPaintableObject = (object) =>
    object.type === 'FRAME'
    || object.type === 'COMPONENT_SET'
    || object.type === 'COMPONENT'
    || object.type === 'INSTANCE'
    || object.type === 'TEXT'
    || object.type === 'RECTANGLE'
    || object.type === 'ELLIPSE'
    || object.type === 'VECTOR'
    || object.type === 'BOOLEAN_OPERATION';
// object.fillStyleId !== undefined
// && object.strokeStyleId !== undefined
// && object.effectStyleId !== undefined;


const isTextObject = (object) =>
    isPaintableObject(object)
    && object.textStyleId !== undefined;

/******* Styles ********/

const validateFillForColorTheme = (object) => {
    let result = { isPlainColor: false, shouldSkip: false };

    // Есть рандомный fill и нет стиля, возвращаем с ошибкой
    if (object.fills.length > 0 && object.fillStyleId === '') {
        result.isPlainColor = true;
        result.shouldSkip = true;
    }
    // У объекта нет fill и нет стиля, пропускаем
    if (object.fills.length === 0 && object.fillStyleId === '') result.shouldSkip = true;

    return result;
}

const validateStrokeForColorTheme = (object) => {
    let result = { isPlainColor: false, shouldSkip: false };

    // Есть рандомный stroke и нет стиля, возвращаем с ошибкой
    if (object.strokes.length > 0 && object.strokeStyleId === '') {
        result.isPlainColor = true;
        result.shouldSkip = true;
    }
    // У объекта нет stroke и нет стиля, пропускаем
    if (object.strokes.length === 0 && object.strokeStyleId === '') result.shouldSkip = true;

    return result;
}

const validateEffectForColorTheme = (object) => {
    let result = { isPlainEffect: false, shouldSkip: false };

    // Есть рандомный effect и нет стиля, возвращаем с ошибкой
    if (object.effects.length > 0 && object.effectStyleId === '') {
        result.isPlainEffect = true;
        result.shouldSkip = true;
    }
    // У объекта нет stroke и нет стиля, пропускаем
    if (object.effects.length === 0 && object.effectStyleId === '') result.shouldSkip = true;

    return result;
}

const validateTextForColorTheme = (object) => {
    let result = { isPlainText: false, shouldSkip: false };

    // Есть рандомный effect и нет стиля, возвращаем с ошибкой
    if (object.textStyleId === '') {
        result.isPlainEffect = true;
        result.shouldSkip = true;
    }

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
        } catch (e) { }
    }

    return [...styles, ...figma.getLocalPaintStyles(), ...figma.getLocalEffectStyles(), ...figma.getLocalTextStyles()];
}

const storeStyles = async () => {
    const paintStyleKeys = figma.getLocalPaintStyles()
        .map(style => style.key);

    const effectStyleKeys = figma.getLocalEffectStyles()
        .map(style => style.key);

    const textStyleKeys = figma.getLocalTextStyles()
        .map(style => style.key);

    // Удаляем предыдущие стили
    await figma.clientStorage.setAsync(kStylesStorageKey, null);

    await figma
        .clientStorage.setAsync(kStylesStorageKey, [...paintStyleKeys, ...effectStyleKeys, ...textStyleKeys]);
}

/******** Debug ********/

const pushError = (errors, object, descr, type = 'error') => {
    errors.push({ object: object, descr: descr, type: type });
}

main();
