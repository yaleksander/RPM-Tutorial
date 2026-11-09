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
	for (const [, mountain] of mapPortion.staticMountainsList)
		arr.push(mountain.mesh);
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
					if (direction.y == 0)
					{
						const collisionCheck = Manager.Collisions.check(mapPortion, jpositionBefore, jp, positionAfter, object, direction, checkedSprites);
						if (collisionCheck[0])
							return positionBefore;
						if (!object.jumpPlugin_jumpFlag && collisionCheck[1] !== null && (yMountain === null || yMountain < collisionCheck[1]))
							yMountain = collisionCheck[1];
					}
					else
					{
						const spritesCheck = Manager.Collisions.checkSprites(mapPortion, jpositionAfter, object, checkedSprites);
						if (spritesCheck[0] || spritesCheck[1] !== null)
							return positionBefore;
						/*
						for (const [, mountain] of mapPortion.staticMountainsList)
							for (const objectBB of object.meshBoundingBox)
								if (Manager.Collisions.obbVSobb(mountain.geometry, objectBB.geometry))
									return positionBefore;
						*/
						const checkFloor = raycastFloors(mapPortion, raycastOrigin, direction, len + 2 * px);
						if (!!checkFloor)
							return checkFloor;
						if (Manager.Collisions.checkLands(mapPortion, jpositionAfter, object))
							return positionBefore;
						if (Manager.Collisions.checkObjects3D(mapPortion, jpositionAfter, positionAfter, object))
							return positionBefore;
					}
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

function adjustMapLoop(pos, fpos, axis, limit, mapLoopEnabled)
{
	if ((!mapLoopEnabled) && (pos[axis] < 0 || pos[axis] >= limit))
		return true;
	if (fpos[axis] < 0)
	{
		fpos[axis] += limit;
		pos[axis] += limit;
	}
	else if (fpos[axis] >= limit)
	{
		fpos[axis] -= limit;
		pos[axis] -= limit;
	}
	return false;
}

function moveHorizontal(obj, v0, time)
{
	obj.updateTerrain();
	const fpos = obj.position.clone().add(v0);
	const orig = obj.position.clone();
	const m = Scene.Map.current;
	const mp = m.mapProperties;

	const blockX = adjustMapLoop(obj.position, fpos, 'x', mp.length, m.mapLoopPlugin_loopX);
	const blockZ = adjustMapLoop(obj.position, fpos, 'z', mp.width, m.mapLoopPlugin_loopZ);

	obj.position = getFuturePosition(obj, orig, fpos);
	if (!blockX && !blockZ && Core.Game.current.playTime.time < time)
		setTimeout(moveHorizontal, timeout, obj, v0, time);
	obj.updateBBPosition(obj.position);
}

function moveVertical(obj, vy)
{
	if (obj.jumpPlugin_fixedVelocityEnabled && !obj.jumpPlugin_jumpFlag)
		vy = obj.jumpPlugin_fixedVelocity;
	if (vy <= 0)
	{
		obj.jumpPlugin_jumpFlag = false;
		obj.jumpPlugin_fallFlag = true;
	}
	const orig = obj.position.clone();
	const fpos = obj.position.clone().setY(obj.position.y + vy);
	obj.position = getFuturePosition(obj, orig, fpos);
	if (obj.position.y != orig.y)
		setTimeout(moveVertical, timeout, obj, vy - gravity, vy);
	else if (vy > 0)
		setTimeout(moveVertical, timeout, obj, -gravity, 0);
	else
		obj.jumpPlugin_fallFlag = false;
	obj.updateBBPosition(obj.position);
}

function isAirborne(obj)
{
	return obj.jumpPlugin_fallFlag || obj.jumpPlugin_jumpFlag || !!getFuturePosition(obj, down, obj.position.clone().add(down))[0];
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
		if (!isAirborne(result.object))
		{
			result.object.jumpPlugin_fallFlag = true;
			setTimeout(moveVertical, 1, result.object, -0.01);
		}
	}, Core.ReactionInterpreter.currentObject);
});

Manager.Plugins.registerCommand(pluginName, "Move", (id, x, z, spd, camera) =>
{
	Core.MapObject.search(id, (result) =>
	{
		const v = new THREE.Vector3(x, 0, z).normalize().applyAxisAngle(down, (camera ? Scene.Map.current.camera.horizontalAngle * Math.PI / 180 : -Math.PI / 2) + Math.PI / 2);
		v.multiplyScalar(spd * result.object.speed.getValue() * Core.MapObject.SPEED_NORMAL * Manager.Stack.averageElapsedTime);
		setTimeout(moveHorizontal, 1, result.object, new THREE.Vector3(v.x, 0, 0), 0);
		setTimeout(moveHorizontal, 1, result.object, new THREE.Vector3(0, 0, v.z), 0);
	}, Core.ReactionInterpreter.currentObject);
});
/*
Manager.Plugins.registerCommand(pluginName, "Check ground", (id, prop) =>
{
	Core.MapObject.search(id, (result) =>
	{
		Core.ReactionInterpreter.currentObject.properties[prop] = !isAirborne(result.object);
	}, Core.ReactionInterpreter.currentObject);
});
*/
Manager.Plugins.registerCommand(pluginName, "Set fixed velocity", (id, enable, value) =>
{
	Core.MapObject.search(id, (result) =>
	{
		result.object.jumpPlugin_fixedVelocity = value;
		result.object.jumpPlugin_fixedVelocityEnabled = enable;
	}, Core.ReactionInterpreter.currentObject);	
});
