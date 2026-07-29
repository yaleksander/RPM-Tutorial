const pluginName = "Gamepad";

const leftStickEventID = Manager.Plugins.getParameter(pluginName, "Left stick event ID");
const rightStickEventID = Manager.Plugins.getParameter(pluginName, "Right stick event ID");
const deadzone = Manager.Plugins.getParameter(pluginName, "Deadzone variable ID");
const repeatDelay = 30;
const prefix = "GPad.";
const params = new Map(
[
	[1, Model.DynamicValue.createNumber(0)],
	[2, Model.DynamicValue.createNumberDouble(0)],
	[3, Model.DynamicValue.createNumberDouble(0)]
]);

var leftStickNeutral = true;
var rightStickNeutral = true;
var keysList = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "Back", "Start", "L3", "R3", "Up", "Down", "Left", "Right", "Home"];

// https://w3c.github.io/gamepad/#remapping
var buttonsList =
[
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

var axesMenuList =
[
	[0, 0, 0, 0],
	[0, 0, 0, 0],
	[0, 0, 0, 0],
	[0, 0, 0, 0]
];

function getKey(id)
{
	if (id >= 0 && id < keysList.length)
		return prefix + keysList[id];
	return "Error";
}

setInterval(function ()
{
	if (!Main.loaded || Manager.Stack.isLoading())
		return;
	const gp = navigator.getGamepads();
	if (!Manager.Stack.isLoading())
	{
		for (var i = 0; i < gp.length; i++)
		{
			if (!!gp[i])
			{
				for (var j = 0; j < gp[i].buttons.length; j++)
				{
					if (gp[i].buttons[j].pressed === true)
					{
						Common.Inputs.keysPressed.add(getKey(j));
						if (buttonsList[i][j] === 0)
						{
							Manager.Stack.onKeyPressed(getKey(j));
							if (!Manager.Stack.isLoading())
								Manager.Stack.onKeyPressedAndRepeat(getKey(j));
						}
						buttonsList[i][j] = Math.min(buttonsList[i][j] + 1, repeatDelay);
						if (!Manager.Stack.isLoading() && buttonsList[i][j] === repeatDelay)
							Manager.Stack.onKeyPressedAndRepeat(getKey(j));
					}
					else
					{
						Common.Inputs.keysPressed.delete(getKey(j));
						if (buttonsList[i][j] > 0)
							Manager.Stack.onKeyReleased(getKey(j));
						buttonsList[i][j] = 0;
					}
				}
				const lh = gp[i].axes[0];
				const lv = gp[i].axes[1];
				const rh = gp[i].axes[2];
				const rv = gp[i].axes[3];
				if (Manager.Stack.top instanceof Scene.Map && !Scene.Map.current.loading && !Core.ReactionInterpreter.blockingHero)
				{
					if (Core.Game.current.getVariable(deadzone) === 0)
						Core.Game.current.variables.set(deadzone, 0.15);
					const d = Math.min(Math.max(Core.Game.current.getVariable(deadzone), 0.05), 0.95);
					params.get(1).value = i + 1;
					if (Math.sqrt(lh * lh + lv * lv) > d)
					{
						params.get(2).value = lh;
						params.get(3).value = lv;
						Core.Game.current.hero.receiveEvent(null, false, leftStickEventID, params, Core.Game.current.heroStates);
						leftStickNeutral = false;
					}
					else if (!leftStickNeutral)
					{
						params.get(2).value = 0;
						params.get(3).value = 0;
						Core.Game.current.hero.receiveEvent(null, false, leftStickEventID, params, Core.Game.current.heroStates);
						leftStickNeutral = true;
					}
					if (Math.sqrt(rh * rh + rv * rv) > d)
					{
						params.get(2).value = rh;
						params.get(3).value = rv;
						Core.Game.current.hero.receiveEvent(null, false, rightStickEventID, params, Core.Game.current.heroStates);
						rightStickNeutral = false;
					}
					else if (!rightStickNeutral)
					{
						params.get(2).value = 0;
						params.get(3).value = 0;
						Core.Game.current.hero.receiveEvent(null, false, rightStickEventID, params, Core.Game.current.heroStates);
						rightStickNeutral = true;
					}
				}
				if (lv < -0.5 || rv < -0.5)
				{
					axesMenuList[i][0] = Math.min(axesMenuList[i][0] + 1, repeatDelay);
					if (axesMenuList[i][0] === 1 || axesMenuList[i][0] === repeatDelay)
						Manager.Stack.onKeyPressedAndRepeat("Up");
				}
				else
					axesMenuList[i][0] = 0;
				if (lv > 0.5 || rv > 0.5)
				{
					axesMenuList[i][1] = Math.min(axesMenuList[i][1] + 1, repeatDelay);
					if (axesMenuList[i][1] === 1 || axesMenuList[i][1] === repeatDelay)
						Manager.Stack.onKeyPressedAndRepeat("Down");
				}
				else
					axesMenuList[i][1] = 0;
				if (lh < -0.5 || rh < -0.5)
				{
					axesMenuList[i][2] = Math.min(axesMenuList[i][2] + 1, repeatDelay);
					if (axesMenuList[i][2] === 1 || axesMenuList[i][2] === repeatDelay)
						Manager.Stack.onKeyPressedAndRepeat("Left");
				}
				else
					axesMenuList[i][2] = 0;
				if (lh > 0.5 || rh > 0.5)
				{
					axesMenuList[i][3] = Math.min(axesMenuList[i][3] + 1, repeatDelay);
					if (axesMenuList[i][3] === 1 || axesMenuList[i][3] === repeatDelay)
						Manager.Stack.onKeyPressedAndRepeat("Right");
				}
				else
					axesMenuList[i][3] = 0;
			}
			else
			{
				for (var j = 0; j < buttonsList[i].length; j++)
				{
					if (buttonsList[i][j] > 0)
					{
						Common.Inputs.keysPressed.delete(getKey(j));
						Manager.Stack.onKeyReleased(getKey(j));
					}
					buttonsList[i][j] = 0;
				}
			}
		}
	}
}, 16);

window.addEventListener("gamepadconnected", (e) =>
{
	/*
	const c = Data.Keyboards.controls;
	const a = Object.getOwnPropertyNames(c);
	for (var i = 0; i < a.length; i++)
		for (var j = 0; j < c[a[i]].sc.length; j++)
			for (var k = 0; k < c[a[i]].sc[j].length; k++)
				if (typeof c[a[i]].sc[j][k] === "string")
					return;
	if (Data.Keyboards.controls["Action"])
		Data.Keyboards.controls["Action"].sc.push(["A"]);
	if (Data.Keyboards.controls["Cancel"])
		Data.Keyboards.controls["Cancel"].sc.push(["B"]);
	if (Data.Keyboards.controls["MainMenu"])
	{
		Data.Keyboards.controls["MainMenu"].sc.push(["B"]);
		Data.Keyboards.controls["MainMenu"].sc.push(["Start"]);
	}
	if (Data.Keyboards.controls["LeftCamera"])
	{
		Data.Keyboards.controls["LeftCamera"].sc.push(["RB"]);
		Data.Keyboards.controls["LeftCamera"].sc.push(["RT"]);
	}
	if (Data.Keyboards.controls["RightCamera"])
	{
		Data.Keyboards.controls["RightCamera"].sc.push(["LB"]);
		Data.Keyboards.controls["RightCamera"].sc.push(["LT"]);
	}
	if (Data.Keyboards.controls["UpMenu"])
		Data.Keyboards.controls["UpMenu"].sc.push(["Up"]);
	if (Data.Keyboards.controls["UpHero"])
		Data.Keyboards.controls["UpHero"].sc.push(["Up"]);
	if (Data.Keyboards.controls["DownMenu"])
		Data.Keyboards.controls["DownMenu"].sc.push(["Down"]);
	if (Data.Keyboards.controls["DownHero"])
		Data.Keyboards.controls["DownHero"].sc.push(["Down"]);
	if (Data.Keyboards.controls["LeftMenu"])
		Data.Keyboards.controls["LeftMenu"].sc.push(["Left"]);
	if (Data.Keyboards.controls["LeftHero"])
		Data.Keyboards.controls["LeftHero"].sc.push(["Left"]);
	if (Data.Keyboards.controls["RightMenu"])
		Data.Keyboards.controls["RightMenu"].sc.push(["Right"]);
	if (Data.Keyboards.controls["RightHero"])
		Data.Keyboards.controls["RightHero"].sc.push(["Right"]);
	for (var i = 0; i < a.length; i++)
		Data.Settings.kb[c[a[i]].id] = c[a[i]].sc;
	Data.Settings.write();
	*/
});

function moveMapObj(id, dir, withCamera)
{
	if (Scene.Map.current.isBattleMap)
		return;
	Core.MapObject.search(id, (result) =>
	{
		if (!!result)
		{
			const cam = Scene.Map.current.camera;
			const angle = cam.horizontalAngle;
			const dist = Math.min(1, result.object.speed.getValue() * Core.MapObject.SPEED_NORMAL * Manager.Stack.averageElapsedTime);
			result.object.move(Common.ORIENTATION.SOUTH, dist * Math.cos(dir * Math.PI / 180), 270 + (withCamera ? angle : -90), withCamera);
			result.object.move(Common.ORIENTATION.SOUTH, dist * Math.sin(dir * Math.PI / 180), 180 + (withCamera ? angle : -90), withCamera);
			if (!result.object.currentStateInstance.directionFix)
			{
				if (withCamera)
					result.object.lookAt(Common.Mathf.mod(Math.round(180 - dir / 90) + Scene.Map.current.camera.getMapOrientation() - 3, 4));
				else
					result.object.lookAt(Common.Mathf.mod(Math.round(180 - dir / 90) - 1, 4));
			}
			Scene.Map.current.mapProperties.checkRandomBattle();
		}
	}, Core.ReactionInterpreter.currentObject);
}

Manager.Plugins.registerCommand(pluginName, "Move 1 step in angle", (id, dir, withCamera) =>
{
	moveMapObj(id, dir, withCamera);
});

Manager.Plugins.registerCommand(pluginName, "Move 1 step in direction", (id, x, y, withCamera) =>
{
	if (x != 0 || y != 0)
		moveMapObj(id, Math.atan2(-y, x) * 180 / Math.PI, withCamera);
});
