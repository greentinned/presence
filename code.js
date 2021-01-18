const kCommandApplyTheme = 'applyTheme';
const kCommandSyncStyles = 'syncStyles';
const kStylesStorageKey = `yg_styles_key`;
const kDefaultStyleNamePattern = 'rootName/themeName/themeSubtype/constName'

async function main() {
    if (figma.command === kCommandApplyTheme) {
        // 1. Получить список объектов для перекраски
        const selectedObjects = figma.currentPage.selection;
        if (selectedObjects.length === 0) figma.closePlugin('Selection is empty');

        // 2. Получить константы стилей локальных или из либы
        // TODO: надо находить константы из либы и переопределять константами локальными
        let resultPaintStylesById = {};
        let resultPaintStylesByName = {};

        const styles = await getStyles();

        styles.forEach(style => {
            resultPaintStylesById[style.id] = style;
            resultPaintStylesByName[style.name] = style;
        });

        // console.log('result styles by id', resultPaintStylesById);
        console.log('result styles by name', resultPaintStylesByName);

        // 3. Найти соответсвие id стиля объекта и самого стиля
        for (const selectedObject of selectedObjects) {
            // 3.1. Если у объекта нет детей, применяем стили и продолжаем цикл
            if (selectedObject.findAll === undefined) continue;
            
            const themeDesc = selectedObject.name;
            const themeDescParts = themeDesc.split('/');
            const themeName = themeDescParts[1];
            const themeSubtype = themeDescParts[2];

            const children = [selectedObject, ...selectedObject.findAll(isPaintableObject)];

            for (let child of children) {
                applyAltStyle(
                    child, 
                    'fills', 
                    'fillStyleId', 
                    themeName, 
                    themeSubtype,
                    resultPaintStylesById, 
                    resultPaintStylesByName,
                );

                applyAltStyle(
                    child, 
                    'strokes', 
                    'strokeStyleId', 
                    themeName, 
                    themeSubtype,
                    resultPaintStylesById, 
                    resultPaintStylesByName,
                );
            }
        }

        figma.closePlugin('Theme applied!');
    }

    if (figma.command === kCommandSyncStyles) {
        await syncStyleKeys();
        figma.closePlugin("Styles updated.");
    }
}

// TODO: возвращать где-то unknown styles для дальнейшей обработки и отображение ошибок

const applyAltStyle = (
    object, 
    styleField, 
    styleIdFieldName, 
    themeName, 
    themeSubtype, 
    stylesById, 
    stylesByName
) => {
    if (object[styleIdFieldName] === undefined) return;
    // 3.2 Если у объекта нет константы стиля, но есть заливка, явно это подсвечиваем
    if (object[styleIdFieldName] === '' && object[styleField].length > 0) {
        const paint = {
            type: 'SOLID',
            color: {r: 1, g: 0, b: 1},
        };
        object[styleField] = [paint];
        return;
    }
    // 3.3 Если у объекта нет константы и нет заливки, пропускаем
    if (object[styleIdFieldName] === '') return;

    // 4. Найти пару для этого стиля по day/night типу
    const fillStyle = stylesById[object[styleIdFieldName]];
    if (fillStyle === undefined) {
        return;
    }

    const altFillStyleName = getAltStyleName(
        kDefaultStyleNamePattern, 
        fillStyle.name, 
        themeName, 
        themeSubtype,
    );

    const altFillStyle = stylesByName[altFillStyleName];

    if (altFillStyle === undefined) {
        figma.closePlugin(`Can't find themeSubtype of '${themeSubtype}'`);
        return;
    }

    // 5. Заменить id стиля на id пары day/night
    object[styleIdFieldName] = altFillStyle.id;
}

const getAltStyleName = (pattern, styleName, themeName, themeSubtype) => {
    const parts = pattern.split('/');
    const newParts = styleName.split('/');

    const themeSubtypeIdx = parts.indexOf('themeSubtype');
    if (themeSubtypeIdx < 0) figma.closePlugin(`Can\'t find themeSubtype of '${themeSubtype}'`);
    newParts[themeSubtypeIdx] = themeSubtype;

    const themeNameIdx = parts.indexOf('themeName');
    if (themeNameIdx < 0) figma.closePlugin(`Cant't find themeName of '${themeName}'`);
    newParts[themeNameIdx] = themeName;

    return newParts.join('/');
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

const isValidThemePath = (themePathPattern, themePath) => 
    themePathPattern.split('/').length === themePath.split('/').length;

const isPaintableObject = (object) => 
    object.fillStyleId !== undefined
    && object.strokeStyleId !== undefined
    && object.effectStyleId !== undefined;

const isTextObject = (object) => 
    object.fillStyleId !== undefined
    && object.strokeStyleId !== undefined
    && object.effectStyleId !== undefined
    && object.textStyleId !== undefined;

main();
