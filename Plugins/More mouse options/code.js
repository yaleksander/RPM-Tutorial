const pluginName = "More mouse options";

const onDownID = Manager.Plugins.getParameter(pluginName, "Mouse down event ID");
const onUpID = Manager.Plugins.getParameter(pluginName, "Mouse up event ID");
const onMoveID = Manager.Plugins.getParameter(pluginName, "Mouse move event ID");
const onWheelID = Manager.Plugins.getParameter(pluginName, "Mouse wheel event ID");
const onGainFocusID = Manager.Plugins.getParameter(pluginName, "Gain focus event ID");
const onLoseFocusID = Manager.Plugins.getParameter(pluginName, "Lose focus event ID");

const raycaster = new THREE.Raycaster();
const va = new THREE.Vector3();
const vb = new THREE.Vector3();

function raycast(v, dist, ignore = false)
{
    Core.Game.current.variables.set(v, -1);
    const intersects = raycaster.intersectObjects(Scene.Map.current.scene.children);
    if (ignore && intersects.length > 0 && intersects[0].object === Core.Game.current.hero.mesh)
        intersects.shift();
    while (intersects.length > 0)
    {
        if (intersects[0].distance === 0)
            intersects.shift();
        else
            break;
    }
    while (intersects.length > 0)
    {
        if (intersects[0].object.material.wireframe || !!intersects[0].object.material.length)
        {
            intersects.shift();
            continue;
        }
		if (!intersects[0].object.material.map || !intersects[0].object.material.map.source || !intersects[0].object.material.map.source.data)
			break
        const img = intersects[0].object.material.map.source.data;
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;
        const x = parseInt(intersects[0].uv.x * img.width);
        const y = parseInt(intersects[0].uv.y * img.height);
        if (data[(x + y * img.width) * 4 + 3] == 0)
            intersects.shift();
        else
            break;
    }
    var mesh = null;
    if (intersects.length > 0 && (dist < 0 || intersects[0].distance < dist))
    {
        if (intersects[0].distance > 0)
            mesh = intersects[0].object;
        else if (intersects.length > 1)
            mesh = intersects[1].object;
    }
    if (!!mesh)
    {
        for (var i = 1; i < Scene.Map.current.maxObjectsID + 1; i++)
        {
            var exitFor = false;
            if (!Scene.Map.current.allObjects[i])
                continue;
            Core.MapObject.search(i, (result) =>
            {
                if (!!result.object.mesh && result.object.mesh === mesh)
                {
                    Core.Game.current.variable.set(v, i);
                    exitFor = true;
                }
            }, Core.ReactionInterpreter.currentObject);
            if (exitFor)
                break;
        }
    }
    return Core.Game.current.getVariable(v);
}

document.addEventListener("mousedown", (e) =>
{
    if (Manager.Stack.top instanceof Scene.Map && !Scene.Map.current.loading && !Core.ReactionInterpreter.blockingHero)
    {
        if (e.button === 0)
            Common.Inputs.mouseLeftPressed = true;
        else if (e.button === 2)
            Common.Inputs.mouseRightPressed = true;
        const x = Model.DynamicValue.createNumber(e.clientX);
        const y = Model.DynamicValue.createNumber(e.clientY);
        const b = Model.DynamicValue.createNumber(e.button);
        Core.Game.current.hero.receiveEvent(null, false, onDownID, [null, x, y, b], Core.Game.current.heroStates);
    }
});

document.addEventListener("mouseup", (e) =>
{
    if (Manager.Stack.top instanceof Scene.Map && !Scene.Map.current.loading && !Core.ReactionInterpreter.blockingHero)
    {
        if (e.button === 0)
            Common.Inputs.mouseLeftPressed = false;
        else if (e.button === 2)
            Common.Inputs.mouseRightPressed = false;
        const x = Model.DynamicValue.createNumber(e.clientX);
        const y = Model.DynamicValue.createNumber(e.clientY);
        const b = Model.DynamicValue.createNumber(e.button);
        Core.Game.current.hero.receiveEvent(null, false, onUpID, [null, x, y, b], Core.Game.current.heroStates);
    }
});

document.addEventListener("mousemove", (e) =>
{
    if (Manager.Stack.top instanceof Scene.Map && !Scene.Map.current.loading && !Core.ReactionInterpreter.blockingHero)
    {
        const x = Model.DynamicValue.createNumber(e.movementX);
        const y = Model.DynamicValue.createNumber(e.movementY);
        Core.Game.current.hero.receiveEvent(null, false, onMoveID, [null, x, y], Core.Game.current.heroStates);
    }
});

document.addEventListener("wheel", (e) =>
{
    if (Manager.Stack.top instanceof Scene.Map && !Scene.Map.current.loading && !Core.ReactionInterpreter.blockingHero)
    {
        if (e.deltaY > 0) // scroll down
            Core.Game.current.hero.receiveEvent(null, false, onWheelID, [null, Model.DynamicValue.createSwitch(true)], Core.Game.current.heroStates);
        else if (e.deltaY < 0) // scroll up
            Core.Game.current.hero.receiveEvent(null, false, onWheelID, [null, Model.DynamicValue.createSwitch(false)], Core.Game.current.heroStates);
    }
});

window.addEventListener("focus", (e) =>
{
    Manager.Events.sendEventDetection(null, -1, false, onGainFocusID, [null]);
});

window.addEventListener("blur", (e) =>
{
    Manager.Events.sendEventDetection(null, -1, false, onLoseFocusID, [null]);
});

Manager.Plugins.registerCommand(pluginName, "Get object under cursor", (variableID, x, y, ignoreHero) =>
{
    x = Common.ScreenResolution.getScreenXReverse(x);
    y = Common.ScreenResolution.getScreenYReverse(y);
    if (Manager.Stack.top instanceof Scene.Map && !Scene.Map.current.loading)
    {
        const cx =  (x / Common.ScreenResolution.SCREEN_X) * 2 - 1;
        const cy = -(y / Common.ScreenResolution.SCREEN_Y) * 2 + 1;
        raycaster.setFromCamera(new THREE.Vector2(cx, cy), Scene.Map.current.camera.getThreeCamera());
        Core.Game.current.variables.set(variableID, raycast(variableID, -1, ignoreHero));
    }
});

Manager.Plugins.registerCommand(pluginName, "Lock pointer", () =>
{
    Manager.GL.renderer.domElement.requestPointerLock();
});

Manager.Plugins.registerCommand(pluginName, "Unlock pointer", () =>
{
    document.exitPointerLock();
});

Manager.Plugins.registerCommand(pluginName, "Is pointer locked?", (variableID) =>
{
    Core.Game.current.variables.set(variableID, document.pointerLockElement === Manager.GL.renderer.domElement);
});

Manager.Plugins.registerCommand(pluginName, "Raycast", (Ax, Ay, Az, Bx, By, Bz, variableID) =>
{
    if (Manager.Stack.top instanceof Scene.Map && !Scene.Map.current.loading)
    {
        const s = Data.Systems.SQUARE_SIZE;
        va.set((Ax + 0.5) * s, (Ay + 0.5) * s, (Az + 0.5) * s);
        vb.set((Bx + 0.5) * s, (By + 0.5) * s, (Bz + 0.5) * s);
        const dist = va.distanceTo(vb) + 1;
        vb.sub(va).normalize();
        raycaster.set(va, vb);
        Core.Game.current.variables.set(variableID, raycast(variableID, dist));
    }
});
