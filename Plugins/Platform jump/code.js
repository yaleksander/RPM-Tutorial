const pluginName = "Platform jump";

const gravity = Manager.Plugins.getParameter(pluginName, "Gravity") / 1000;
const raycaster = new THREE.Raycaster();
const up = new THREE.Vector3(0, 1, 0);
const down = new THREE.Vector3(0, -1, 0);
const timeout = 10;

function raycastFloors(mapPortion, position, direction, length)
{
	raycaster.set(position, direction);
	raycaster.far = length;
	const arr = [];
	if (!!mapPortion.staticFloorsMesh)
		arr.push(mapPortion.staticFloorsMesh);
	for ([key, value] of mapPortion.staticMountainsList)
		arr.push(value.mesh);
	if (arr.length == 0)
		return null;
	const intersect = raycaster.intersectObjects(arr);
	if (intersect.length > 0)
		return position.setY(intersect[0].point.y);
	return null;
}

function getFuturePosition(object, positionBefore, positionAfter)
{
	const mp = Scene.Map.current.mapProperties;
	positionAfter.setY(Math.min(Math.max(positionAfter.y, -mp.depth), mp.height));
	object.updateBBPosition(positionAfter);
	if (Manager.Collisions.checkObjectsRay(positionAfter, object))
		return positionBefore;
	const direction = Manager.Collisions._scratchDirection.subVectors(positionAfter, positionBefore);
	const len = direction.length();
	direction.normalize();
	const px = 1.0 / Data.Systems.SQUARE_SIZE;
	const raycastOrigin = positionBefore.clone().setY(positionBefore.y + px);
	const jpositionBefore = Manager.Collisions._scratchJPositionBefore;
	jpositionBefore.x = Math.floor(positionBefore.x);
	jpositionBefore.y = Math.floor(positionBefore.y);
	jpositionBefore.z = Math.floor(positionBefore.z);
	const jpositionAfter = Manager.Collisions._scratchJPositionAfter;
	jpositionAfter.x = Math.floor(positionAfter.x);
	jpositionAfter.y = Math.floor(positionAfter.y);
	jpositionAfter.z = Math.floor(positionAfter.z);
	const positionAfterPlus = Manager.Collisions._scratchPositionAfterPlus;
	const checkedSprites = new Set();
	var [startI, endI, startJ, endJ, startK, endK] = object.getSquaresBB();
	const bounds = object.currentBoundingBox?.geometry.boundingBox;
	if (bounds)
	{
		const tileX = Math.floor(positionAfter.x);
		const tileZ = Math.floor(positionAfter.z);
		startI = Math.max(startI, Math.floor(bounds.min.x) - tileX - 1);
		endI = Math.min(endI, Math.floor(bounds.max.x) - tileX + 1);
		startK = Math.max(startK, Math.floor(bounds.min.z) - tileZ - 1);
		endK = Math.min(endK, Math.floor(bounds.max.z) - tileZ + 1);
	}
	var i, j, k, mapPortion, yMountain = null;
	const chunkSize = Common.Constants.PORTION_SIZE;
	const cp = Scene.Map.current.currentPortion;
	const lp = Manager.Collisions._scratchCheckPortion;
	const jp = Manager.Collisions._scratchCheckPosition;
	for (i = startI; i <= endI; i++)
	{
		for (j = startJ; j <= endJ; j++)
		{
			for (k = startK; k <= endK; k++)
			{
				positionAfterPlus.set(positionAfter.x + i, positionAfter.y + j, positionAfter.z + k);
				lp.x = Math.floor(positionAfterPlus.x / chunkSize) - cp.x;
				lp.y = Math.floor(positionAfterPlus.y / chunkSize) - cp.y;
				lp.z = Math.floor(positionAfterPlus.z / chunkSize) - cp.z;
				mapPortion = Scene.Map.current.getMapPortion(lp.x, lp.y, lp.z);
				if (mapPortion)
				{
					jp.x = jpositionAfter.x + i;
					jp.y = jpositionAfter.y + j;
					jp.z = jpositionAfter.z + k;
					const result = Manager.Collisions.check(mapPortion, jpositionBefore, jp, positionAfter, object, direction, checkedSprites);
					if (result[0])
						return positionBefore;
					if (direction.y == 0)
					{
						/*
						const mountains = Manager.Collisions.checkMountains(mapPortion, jpositionAfter, positionAfter, object);
						if (mountains[0])
							return positionBefore;
						if (mountains[1] !== null && (yMountain === null || yMountain < mountains[1]))
							yMountain = mountains[1];
						*/
						if (result[1] !== null && (yMountain === null || yMountain < result[1]))
							yMountain = result[1];
					}
					else
					{
						const mountains = Manager.Collisions.checkMountains(mapPortion, jpositionAfter, positionAfter, object);
						if (mountains[0])
							console.log("fuck my chud baka life");
						const checkFloor = raycastFloors(mapPortion, raycastOrigin, direction, len + 2 * px);
						if (!!checkFloor)
							return checkFloor;
					}
					/*
					const sprites = Manager.Collisions.checkSprites(mapPortion, jpositionAfter, object, checkedSprites);
					if (sprites[0] || sprites[1] !== null)
						return positionBefore;
					if (Manager.Collisions.checkLands(mapPortion, jpositionBefore, jpositionAfter, object, direction))
						return positionBefore;
					if (Manager.Collisions.checkObjects3D(mapPortion, jpositionAfter, positionAfter, object))
						return positionBefore;
					*/
				}
			}
		}
	}
	if (!!yMountain)
		positionAfter.setY(yMountain);
	mapPortion = Scene.Map.current.getMapPortionByPosition(jpositionAfter);
	const checkUp = raycastFloors(mapPortion, positionAfter, up, px);
	if (!!checkUp)
		return checkUp;
	const checkDown = raycastFloors(mapPortion, positionAfter, up, px);
	if (!!checkDown)
		return checkDown;
	return positionAfter;
}

function moveHorizontal(obj, v0, time)
{
	obj.updateTerrain();
	const fpos = obj.position.clone().add(v0);
	const orig = obj.position.clone();
	const m = Scene.Map.current;
	const mp = m.mapProperties;

	// add map loop compatibility
	var blocked = false;
	if (!m.mapLoopPlugin_loopX)
	{
		if (fpos.x < 0 || fpos.x >= mp.length)
			blocked = true;
	}
	else
	{
		if (fpos.x < 0)
		{
			fpos.x += mp.length;
			obj.position.x += mp.length;
		}
		if (fpos.x >= mp.length)
		{
			fpos.x -= mp.length;
			obj.position.x -= mp.length;
		}
	}
	if (!m.mapLoopPlugin_loopZ)
	{
		if (fpos.z < 0 || fpos.z >= mp.width)
			blocked = true;
	}
	else
	{
		if (fpos.z < 0)
		{
			fpos.z += mp.width;
			obj.position.z += mp.width;
		}
		if (fpos.z >= mp.width)
		{
			fpos.z -= mp.width;
			obj.position.z -= mp.width;
		}
	}

	obj.position = getFuturePosition(obj, orig, fpos);
	if (!blocked && Core.Game.current.playTime.time < time)
		setTimeout(moveHorizontal, timeout, obj, v0, time);
	obj.updateBBPosition(obj.position);
}

function moveVertical(obj, vy)
{
	//console.log(vy);
	if (obj.jumpPlugin_fixedVelocityEnabled && !obj.jumpPlugin_jumpFlag)
		vy = obj.jumpPlugin_fixedVelocity;
	if (/*obj.jumpPlugin_jumpFlag &&*/ vy <= 0)
	{
		obj.jumpPlugin_jumpFlag = false;
		obj.jumpPlugin_fallFlag = true;
	}
	const orig = obj.position.clone();
	const fpos = obj.position.clone().setY(obj.position.y + vy);
	obj.position = getFuturePosition(obj, orig, fpos);
	if (obj.position.y != orig.y)
	{
		//console.log("keep going");
		setTimeout(moveVertical, timeout, obj, vy - gravity, vy);
	}
	else if (vy > 0)
	{
		//console.log("hit");
		setTimeout(moveVertical, timeout, obj, -gravity, 0);
	}
	else
	{
		/*
		const px = 1.0 / Data.Systems.SQUARE_SIZE;
		for (var i = vy + px; i < 0; i += px)
		{
			console.log(i);
			const before = obj.position.y;
			fpos.setY(orig.y + i);
			obj.position = getFuturePosition(obj, orig, fpos);
			if (obj.position.y != before)
				break;
		}
		*/
		obj.jumpPlugin_fallFlag = false;
		//console.log("finally...");
	}
	obj.updateBBPosition(obj.position);
}

function isAirborne(obj)
{
	return false;//!getFuturePosition(obj, down, obj.position.clone().add(down))[0];
}

Manager.Plugins.registerCommand(pluginName, "Jump", (id, peak) =>
{
	Core.MapObject.search(id, (result) =>
	{
		result.object.jumpPlugin_jumpFlag = true;
		result.object.jumpPlugin_fallFlag = false;
		// consider v² = v0² + 2aΔs. we want to find v0. a = -gravity, Δs = peak, v = 0. then: v0 = √(2 * peak * gravity)
		setTimeout(moveVertical, 1, result.object, Math.sqrt(2 * peak * gravity));
	}, Core.ReactionInterpreter.currentObject);
});

Manager.Plugins.registerCommand(pluginName, "Fall", (id) =>
{
	Core.MapObject.search(id, (result) =>
	{
		if (/*isAirborne(result.object) &&*/ !result.object.jumpPlugin_jumpFlag && !result.object.jumpPlugin_fallFlag)
		{
			result.object.jumpPlugin_fallFlag = true;
			setTimeout(moveVertical, 1, result.object, -0.01);
		}
	}, Core.ReactionInterpreter.currentObject);
});

Manager.Plugins.registerCommand(pluginName, "Maneuver", (id, x, z, spd, camera) =>
{
	Core.MapObject.search(id, (result) =>
	{
		const v = new THREE.Vector3(x, 0, z).normalize().applyAxisAngle(down, (camera ? Scene.Map.current.camera.horizontalAngle * Math.PI / 180 : -Math.PI / 2) + Math.PI / 2);
		v.multiplyScalar(spd * result.object.speed.getValue() * Core.MapObject.SPEED_NORMAL * Manager.Stack.averageElapsedTime);
		setTimeout(moveHorizontal, 1, result.object, v, 0);
	}, Core.ReactionInterpreter.currentObject);
});

Manager.Plugins.registerCommand(pluginName, "Check ground", (id, prop) =>
{
	Core.MapObject.search(id, (result) =>
	{
		Core.ReactionInterpreter.currentObject.properties[prop] = !isAirborne(result.object);
	}, Core.ReactionInterpreter.currentObject);
});

Manager.Plugins.registerCommand(pluginName, "Set fixed velocity", (id, enable, value) =>
{
	Core.MapObject.search(id, (result) =>
	{
		result.object.jumpPlugin_fixedVelocity = value;
		result.object.jumpPlugin_fixedVelocityEnabled = enable;
	}, Core.ReactionInterpreter.currentObject);	
});
