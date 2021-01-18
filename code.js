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
        const styles = await getStyles();

        // Хэш с ключами — id стиля, нужен чтобы найти стиль по его id у текущего объекта
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
            if (!isValidThemePath(themePath)) {
                const warnMsg = `Theme path is invalid: ${themePath}`;
                console.warn(warnMsg);
                figma.closePlugin(warnMsg);
                return;
            }
            // Получаем компоненты themePath
            const [themeTypes, themeName, themeVariant, themeConst] = parseThemePath(expandThemePath(themePath));

            // Текущий объект не имеет детей, пропускаем
            if (selectedObject.findAll === undefined) {
                console.warn('Skip empty object', selectedObject);
                continue;
            }

            // Объодим все объекты, включая экран
            const objects = [selectedObject, ...selectedObject.findAll()];
            for (let object of objects) {
                // Для каждого themeType, то есть для ColorTheme, EffectTheme, TextTheme
                for (const themeType of themeTypes) {
                    // Ищем стиль
                    // TODO: проверять объект можно ли к нему применять стили
                    const style = findStyle(themeType, themeName, themeVariant, themeConst, stylesById, stylesByName);
                    // Применяем стиль
                    const [errStyle, errObject] = themeTypeToFnMap[themeType](style, object);
                    if (errStyle !== undefined && errObject !== undefined) {
                        console.warn('Unknown style', errStyle, errObject);
                    }
                }
            }
        }

        figma.closePlugin('Theme applied!');
    }

    if (figma.command === kCommandSyncStyles) {
        await syncStyleKeys();
        figma.closePlugin("Styles updated.");
    }
}

/******* Theme Path ********/

const isValidThemePath = (themePath) => {
    const themePathParts = themePath.split('/').map(elem => elem.trim()).filter(elem => elem !== '');
    const length = themePathParts.length;
    return length === 2 || length === 4;
}

const expandThemePath = (themePath) => {
    const themePathParts = themePath.split('/').map(elem => elem.trim()).filter(elem => elem !== '');
    const length = themePathParts.length;

    // 2 элемента в themePath, например Pro/Day
    if (length == 2) {
        const [themeName, themeVariant] = themePathParts;
        return `ColorTheme,EffectTheme,TextTheme/${themeName}/${themeVariant}/*`;
    }
    
    // 4 элемента в themePath, например */Pro/Day/*
    const [themeTypes, themeName, themeVariant, themeConst] = themePathParts;

    // Раскрываем * для themeTypes
    if (themeTypes === '*') {
        return `ColorTheme,EffectTheme,TextTheme/${themeName}/${themeVariant}/${themeConst}`
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
    object.fillStyleId !== undefined
    && object.strokeStyleId !== undefined
    && object.effectStyleId !== undefined
    && object.textStyleId !== undefined;

/******* Styles ********/

const findStyle = (
    themeType,
    themeName, 
    themeVariant, 
    themeConst, 
    stylesById, 
    stylesByName,
    object,
) => {
    const themeTypeToStyleField = {
        ColorTheme: ''
    }
    // Подходит любая константа у текущего объекта
    if (themeConst === '*') {
        const objectStyle = object.fillStyleId
    }
}

const applyColorTheme = (style, object) => {
    if (style === undefined || object === undefined) return [null, null];
    // Есть рандомный fill и нет стиля, возвращаем с ошибкой
    if (object.fills.length > 0 && object.fillStyleId === '') return [style, object]; 
    // У объекта нет fill и нет стиля, пропускаем
    if (object.fills.length === 0 && object.fillStyleId === '') return [];
    // Применяем заливку
    object.fillStyleId = style.id;

    // Есть рандомная stroke и нет стиля, возвращаем с ошибкой
    if (object.strokes.length > 0 && object.strokeStyleId === '') return [style, object]; 
    // У объекта нет рандомной заливки и нет стиля, пропускаем
    if (object.strokes.length === 0 && object.strokeStyleId === '') return [];
    // Применяем stroke
    object.strokeStyleId = style.id;

    return [];
}

// TODO: Unimplemented
const applyEffectTheme = (style, object) => [];
//
// TODO: Unimplemented
const applyTextTheme = (style, object) => [];

const themeTypeToFnMap = {
    ColorTheme: applyColorTheme,
    EffectTheme: applyEffectTheme,
    TextTheme: applyTextTheme,
}

// При синхронизации стили каждого документа (либы) сохраняются в соответствующем пространстве имен, 
// чтобы стили файлов при совпадении имен констант не оверрайдились
//
// TODO: Как понять из какого документа (пространства имен) надо брать стиль? 
// Автоматически нельзя понять название документа. 
// - Или при синхронизации перезаписывать все стили (current)
// - Или его надо хранить в названии константы
const getStyles = async () => {
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

// TODO: Кэшировать после синхронизации
// TODO: Идея где можно ускориться: возможно если сделать сразу ui plugin, он не будет удаляться посде отработки, 
// а значит закешированые значения не будут перезапрашиваться из storage
const syncStyleKeys = async () => {
    const paintStyleKeys = figma.getLocalPaintStyles()
        .map((style) => style.key);

    await figma.clientStorage.setAsync(kStylesStorageKey, null);
    await figma
        .clientStorage.setAsync(kStylesStorageKey, paintStyleKeys);
}

main();
