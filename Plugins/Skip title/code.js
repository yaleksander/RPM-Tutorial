const pluginName = "Skip title";

var currentGame = null;
var settings =
{
	name: function()
	{
		return "Enable Settings on Systems tab!";
	}
};

class WaitSaveLoadAsync extends EventCommand.Base
{
	constructor()
	{
		super();
		this.asyncSaveLoadFinished = false;
	}

	update(currentState)
	{
		return this.asyncSaveLoadFinished;
	}
}

class WaitSaveLoadScene extends EventCommand.Base
{
	constructor()
	{
		super();
		this.prevScene = Manager.Stack.top;
		this.beginCheck = false;
	}

	update(currentState)
	{
		return this.beginCheck && this.prevScene === Manager.Stack.top;
	}
}

Scene.TitleScreen.prototype.load = async function ()
{
	Core.Game.current = null;
	Manager.Videos.stop();
	Manager.Songs.stopAll();
	Manager.GL.screenTone.set(0, 0, 0, 1);
	Manager.Stack.displayedPictures = [];
	this.pictureBackground = await Core.Picture2D.loadImage();
	Data.TitlescreenGameover.getTitleCommandsNames().forEach(command =>
	{
		if (command.datas.kind === Common.TITLE_COMMAND_KIND.SETTINGS)
			settings = command.datas;
	});
	Model.TitleCommand.startNewGame();
};

Scene.LoadGame.prototype.cancel = function (isKey, options = {})
{
	if (Scene.MenuBase.checkCancelMenu(isKey, options))
	{
		Core.Game.current = currentGame;
		Data.Systems.soundCancel.playSound();
		Manager.Stack.pop();
		Manager.Stack.pop();
	}
};

function addCustomWaitCommand(alt = false)
{
	const c = Core.ReactionInterpreter.currentReaction.currentCommand;
	console.log(c);
	if (!c.hasCustomWaitCommand)
	{
		c.hasCustomWaitCommand = true;
		const n = c.next;
		if (!alt)
			c.next = new Core.Node(c.parent, new WaitSaveLoadAsync());
		else
			c.next = new Core.Node(c.parent, new WaitSaveLoadScene());
		c.next.next = n;
	}
	else
	{
		if (!alt)
			c.next.data.asyncSaveLoadFinished = false;
		else
		{
			c.beginCheck = false;
			c.next.prevScene = Manager.Stack.top;
		}
	}
	return c.next;
}

Manager.Plugins.registerCommand(pluginName, "Save slot", (slot) =>
{
	const waitCommand = addCustomWaitCommand();
	Core.Game.current.save(slot);
	waitCommand.data.asyncSaveLoadFinished = true;
});

Manager.Plugins.registerCommand(pluginName, "Load slot", async (slot) =>
{
	const waitCommand = addCustomWaitCommand();
	if (await Common.IO.fileExists(Common.Paths.SAVES + "/" + slot + ".json"))
	{
		Data.Systems.soundConfirmation.playSound();
		Manager.Stack.replace(new Scene.Base());
		const game = new Core.Game(slot);
		await game.load();
		Core.Game.current = game;
		Core.Game.current.loadPositions();
		Core.Game.current.hero.initializeProperties();
		Manager.Stack.replace(new Scene.Map(Core.Game.current.currentMapID));
	}
	else
		Data.Systems.soundImpossible.playSound();
	waitCommand.data.asyncSaveLoadFinished = true;
});

Manager.Plugins.registerCommand(pluginName, "Delete slot", async (slot) =>
{
	const waitCommand = addCustomWaitCommand();
	const fs = require("fs").promises;
	try
	{
		await fs.unlink(Common.Paths.SAVES + "/" + slot + ".json");
	}
	catch (e)
	{
		console.error(e);
	}
	waitCommand.data.asyncSaveLoadFinished = true;
});

Manager.Plugins.registerCommand(pluginName, "Slot exists?", async (slot, variable) =>
{
	const waitCommand = addCustomWaitCommand();
	Core.Game.current.variables.set(variable, -1);
	var res = await Common.IO.fileExists(Common.Paths.SAVES + "/" + slot + ".json");
	Core.Game.current.variables.set(variable, res);
	waitCommand.data.asyncSaveLoadFinished = true;
});

Manager.Plugins.registerCommand(pluginName, "Get slot variable", async (slot, variable, result) =>
{
	const waitCommand = addCustomWaitCommand();
	const game = new Core.Game(slot);
	try
	{
		await game.load();
		Core.Game.current.variables.set(result, game.getVariable(variable));
	}
	catch (e)
	{
		Core.Game.current.variables.set(result, e);
	}
	waitCommand.data.asyncSaveLoadFinished = true;
});

Manager.Plugins.registerCommand(pluginName, "Open load menu", () =>
{
	const waitCommand = addCustomWaitCommand(true);
	currentGame = Core.Game.current;
	Manager.Stack.push(new Scene.Base());
	Manager.Stack.push(new Scene.LoadGame());
	waitCommand.data.beginCheck = true;
});

Manager.Plugins.registerCommand(pluginName, "Open settings menu", () =>
{
	const waitCommand = addCustomWaitCommand(true);
	Manager.Stack.push(new Scene.TitleSettings(settings));
	waitCommand.data.beginCheck = true;
});

Manager.Plugins.registerCommand(pluginName, "Quit game", () =>
{
	Model.TitleCommand.exit();
});
