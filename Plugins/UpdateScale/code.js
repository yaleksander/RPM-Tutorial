const pluginName = "UpdateScale";

Manager.Plugins.registerCommand(pluginName, "Update all map objects", (x, y, z) =>
{
	for (mesh of Scene.Map.current.scene)
		mesh.scale.set(x, y, z);
});
