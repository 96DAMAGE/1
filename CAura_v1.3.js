var script = registerScript({
    name: "CAura",
    version: "1.6",
    authors: ["OpenAI"]
});

var mc = Java.type("net.minecraft.client.Minecraft").getMinecraft();
var Setting = Java.type("net.ccbluex.liquidbounce.script.api.global.Setting");
var LiquidBounce = Java.type("net.ccbluex.liquidbounce.LiquidBounce");
var Rotation = Java.type("net.ccbluex.liquidbounce.utils.Rotation");
var RotationUtils = Java.type("net.ccbluex.liquidbounce.utils.RotationUtils");

var EntityLivingBase = Java.type("net.minecraft.entity.EntityLivingBase");
var EntityPlayer = Java.type("net.minecraft.entity.player.EntityPlayer");
var EntityMob = Java.type("net.minecraft.entity.monster.EntityMob");
var EntityGhast = Java.type("net.minecraft.entity.monster.EntityGhast");
var EntitySlime = Java.type("net.minecraft.entity.monster.EntitySlime");
var EntityDragon = Java.type("net.minecraft.entity.boss.EntityDragon");
var EntityWither = Java.type("net.minecraft.entity.boss.EntityWither");
var EntityWolf = Java.type("net.minecraft.entity.passive.EntityWolf");
var EntityGolem = Java.type("net.minecraft.entity.monster.EntityGolem");
var EntityAnimal = Java.type("net.minecraft.entity.passive.EntityAnimal");
var EntitySquid = Java.type("net.minecraft.entity.passive.EntitySquid");
var EntityBat = Java.type("net.minecraft.entity.passive.EntityBat");
var EntityVillager = Java.type("net.minecraft.entity.passive.EntityVillager");

var ItemSword = Java.type("net.minecraft.item.ItemSword");
var C02PacketUseEntity = Java.type("net.minecraft.network.play.client.C02PacketUseEntity");
var C02Action = Java.type("net.minecraft.network.play.client.C02PacketUseEntity$Action");
var C07PacketPlayerDigging = Java.type("net.minecraft.network.play.client.C07PacketPlayerDigging");
var C07Action = Java.type("net.minecraft.network.play.client.C07PacketPlayerDigging$Action");
var C08PacketPlayerBlockPlacement = Java.type("net.minecraft.network.play.client.C08PacketPlayerBlockPlacement");
var BlockPos = Java.type("net.minecraft.util.BlockPos");
var EnumFacing = Java.type("net.minecraft.util.EnumFacing");
var ClientUtils = Java.type("net.ccbluex.liquidbounce.utils.ClientUtils");
var System = Java.type("java.lang.System");

var rangeValue = Setting["float"]({
    name: "Range",
    default: 5.2,
    min: 1.0,
    max: 8.0
});

var wallRangeValue = Setting["float"]({
    name: "Walls Range",
    default: 3.0,
    min: 1.0,
    max: 6.0
});

var minAgeValue = Setting.integer({
    name: "Min Target Age",
    default: 8,
    min: 0,
    max: 200
});

var fallDistanceValue = Setting["float"]({
    name: "Fall Distance",
    default: 0.66,
    min: 0.05,
    max: 2.0
});

var switchTimerValue = Setting["float"]({
    name: "Switch Timer (ms)",
    default: 0.66,
    min: 0.01,
    max: 1000.0
});

var criticalOffset1Value = Setting["float"]({
    name: "Y Offset 1",
    default: 0.07,
    min: 0.0,
    max: 0.20
});

var criticalOffset2Value = Setting["float"]({
    name: "Y Offset 2",
    default: 0.07,
    min: 0.0,
    max: 0.20
});

var criticalOffset3Value = Setting["float"]({
    name: "Y Offset 3",
    default: 0.07,
    min: 0.0,
    max: 0.20
});

var playersValue = Setting["boolean"]({
    name: "Players",
    default: true
});

var monstersValue = Setting["boolean"]({
    name: "Monsters",
    default: false
});

var golemsValue = Setting["boolean"]({
    name: "Golems",
    default: false
});

var animalsValue = Setting["boolean"]({
    name: "Animals",
    default: false
});

var batsValue = Setting["boolean"]({
    name: "Bats",
    default: false
});

var villagersValue = Setting["boolean"]({
    name: "Villagers",
    default: false
});

var attackFriendsValue = Setting["boolean"]({
    name: "Attack Friends",
    default: false
});

var armorCheckValue = Setting["boolean"]({
    name: "Armor Check",
    default: false
});

var criticalsValue = Setting["boolean"]({
    name: "Criticals",
    default: true
});

var autoBlockValue = Setting["boolean"]({
    name: "AutoBlock",
    default: true
});

var noSlowdownValue = Setting["boolean"]({
    name: "NoSlowdown",
    default: true
});

var noSwingValue = Setting["boolean"]({
    name: "NoSwing",
    default: false
});

var duraHelmetValue = Setting["boolean"]({
    name: "Dura Helmet",
    default: false
});

var duraChestValue = Setting["boolean"]({
    name: "Dura Chestplate",
    default: false
});

var duraLegsValue = Setting["boolean"]({
    name: "Dura Leggings",
    default: false
});

var duraBootsValue = Setting["boolean"]({
    name: "Dura Boots",
    default: false
});

var aura = {
    target: null,
    targets: [],
    targetIndex: 0,
    setupTick: false,
    lastSwitchNanos: 0,
    blocking: false,
    module: null,
    customMotionPending: false,
    customMotionApplied: false,
    customMotionY: 0.0,
    pendingCriticalTarget: null,
    pendingCriticalAge: 0,
    attackThisTick: false,
    offsetLastPacketAura: false,
    pendingJump: false,
    duraTargetId: -1,
    moveErrorShown: false,

    reset: function() {
        this.target = null;
        this.targets = [];
        this.targetIndex = 0;
        this.setupTick = false;
        this.lastSwitchNanos = 0;
        this.blocking = false;
        this.customMotionPending = false;
        this.customMotionApplied = false;
        this.customMotionY = 0.0;
        this.pendingCriticalTarget = null;
        this.pendingCriticalAge = 0;
        this.attackThisTick = false;
        this.offsetLastPacketAura = false;
        this.pendingJump = false;
        this.duraTargetId = -1;

        try {
            RotationUtils.reset();
        } catch (e) {}
    },

    isFriend: function(entity) {
        try {
            return LiquidBounce.fileManager.friendsConfig.isFriend(
                entity.getName()
            );
        } catch (e) {
            return false;
        }
    },

    hasArmor: function(entity) {
        try {
            var armor = entity.inventory.armorInventory;

            for (var i = 0; i < armor.length; i++) {
                if (armor[i] != null) {
                    return true;
                }
            }
        } catch (e) {}

        return false;
    },

    isTargetType: function(entity, player) {
        if (entity instanceof EntityPlayer) {
            if (!playersValue.get()) {
                return false;
            }

            if (entity.getEntityId() === player.getEntityId()) {
                return false;
            }

            if (!attackFriendsValue.get() && this.isFriend(entity)) {
                return false;
            }

            if (armorCheckValue.get() && !this.hasArmor(entity)) {
                return false;
            }

            return true;
        }

        if (monstersValue.get()) {
            if (entity instanceof EntityMob ||
                entity instanceof EntityGhast ||
                entity instanceof EntityDragon ||
                entity instanceof EntityWither ||
                entity instanceof EntitySlime) {
                return true;
            }

            if (entity instanceof EntityWolf) {
                try {
                    var owner = entity.getOwner();

                    if (owner == null ||
                        owner.getEntityId() !== player.getEntityId()) {
                        return true;
                    }
                } catch (e) {
                    return true;
                }
            }
        }

        if (golemsValue.get() && entity instanceof EntityGolem) {
            return true;
        }

        if (animalsValue.get() &&
            (entity instanceof EntityAnimal ||
             entity instanceof EntitySquid)) {
            return true;
        }

        if (batsValue.get() && entity instanceof EntityBat) {
            return true;
        }

        if (villagersValue.get() && entity instanceof EntityVillager) {
            return true;
        }

        return false;
    },

    isValid: function(entity, player) {
        if (entity == null ||
            !(entity instanceof EntityLivingBase)) {
            return false;
        }

        if (entity.getEntityId() === player.getEntityId()) {
            return false;
        }

        if (!player.isEntityAlive() || !entity.isEntityAlive()) {
            return false;
        }

        if (entity.ticksExisted < minAgeValue.get()) {
            return false;
        }

        if (!this.isTargetType(entity, player)) {
            return false;
        }

        var distance = player.getDistanceToEntity(entity);
        var visible = player.canEntityBeSeen(entity);
        var allowedRange = visible
            ? rangeValue.get()
            : wallRangeValue.get();

        return distance <= allowedRange;
    },

    updateTargets: function(player) {
        var list = [];
        var loaded = mc.theWorld.loadedEntityList;

        for (var i = 0; i < loaded.size(); i++) {
            var entity = loaded.get(i);

            if (this.isValid(entity, player)) {
                list.push(entity);
            }
        }

        list.sort(function(a, b) {
            return b.getHealth() - a.getHealth();
        });

        this.targets = list;

        if (this.targets.length === 0) {
            this.targetIndex = 0;
            this.target = null;
            return;
        }

        if (this.targetIndex >= this.targets.length) {
            this.targetIndex = 0;
        }

        this.target = this.targets[this.targetIndex];
    },

    getRotations: function(player, target) {
        var dx = target.posX - player.posX;
        var dz = target.posZ - player.posZ;

        var targetY = target.posY + target.getEyeHeight() * 0.85;
        var playerY = player.posY + player.getEyeHeight();

        var dy = targetY - playerY;
        var horizontal = Math.sqrt(dx * dx + dz * dz);

        var yaw = Math.atan2(dz, dx) * 180.0 / Math.PI - 90.0;
        var pitch = -Math.atan2(dy, horizontal) * 180.0 / Math.PI;

        if (pitch > 90.0) {
            pitch = 90.0;
        }

        if (pitch < -90.0) {
            pitch = -90.0;
        }

        return new Rotation(yaw, pitch);
    },

    sendPacket: function(packet) {
        try {
            mc.getNetHandler().addToSendQueue(packet);
        } catch (e) {
            try {
                mc.thePlayer.sendQueue.addToSendQueue(packet);
            } catch (ignored) {}
        }
    },

    sendReleaseBlock: function() {
        this.sendPacket(new C07PacketPlayerDigging(
            C07Action.RELEASE_USE_ITEM,
            BlockPos.ORIGIN,
            EnumFacing.DOWN
        ));
    },

    sendStartBlock: function(player) {
        if (!autoBlockValue.get() || player == null) {
            return;
        }

        var stack = player.getHeldItem();

        if (stack == null || !(stack.getItem() instanceof ItemSword)) {
            return;
        }

        try {
            mc.playerController.sendUseItem(
                player,
                mc.theWorld,
                stack
            );

            this.blocking = true;
        } catch (e) {
            this.sendPacket(
                new C08PacketPlayerBlockPlacement(stack)
            );

            this.blocking = true;
        }

        if (noSlowdownValue.get() && !this.isNoSlowEnabled()) {
            this.sendReleaseBlock();
        }
    },

    sendReblock: function(player) {
        if (!autoBlockValue.get() || player == null) {
            return;
        }

        var stack = player.getHeldItem();

        if (stack == null || !(stack.getItem() instanceof ItemSword)) {
            return;
        }

        this.sendPacket(
            new C08PacketPlayerBlockPlacement(stack)
        );

        this.blocking = true;
    },

    isNoSlowEnabled: function() {
        try {
            var noSlow = LiquidBounce.moduleManager.getModule("NoSlow");

            return noSlow != null && noSlow.getState();
        } catch (e) {
            return false;
        }
    },

    canSpoofCritical: function(player) {
        if (!criticalsValue.get() || this.targets.length === 0) {
            return false;
        }

        if (!player.isCollidedVertically) {
            return false;
        }

        try {
            var speed = LiquidBounce.moduleManager.getModule("Speed");

            if (speed != null && speed.getState()) {
                var bhop = null;

                try {
                    bhop = speed.getValue("BHop");
                } catch (e1) {}

                if (bhop == null) {
                    try {
                        bhop = speed.getValue("Bhop");
                    } catch (e2) {}
                }

                if (bhop != null &&
                    bhop.get() === true &&
                    (player.moveForward !== 0 || player.moveStrafing !== 0)) {
                    return false;
                }
            }
        } catch (e) {}

        return true;
    },

    prepareCustomMotion: function(player) {
        var customMotionPhase = this.setupTick;
        this.attackThisTick = !customMotionPhase;
        this.customMotionPending = false;
        this.customMotionY = 0.0;
        this.offsetLastPacketAura = false;

        var criticalAllowed =
            this.targets.length > 0 &&
            criticalsValue.get() &&
            player.isCollidedVertically &&
            this.canSpoofCritical(player);

        if (customMotionPhase) {
            if (criticalAllowed && this.pendingCriticalTarget == null) {
                this.offsetLastPacketAura = true;
                this.customMotionPending = true;
                this.customMotionY =
                    criticalOffset1Value.get() +
                    criticalOffset2Value.get() +
                    criticalOffset3Value.get();
            }

            var now = System.nanoTime();
            var switchNanos = switchTimerValue.get() * 1000000.0;

            if (this.targets.length > 1 &&
                now - this.lastSwitchNanos >= switchNanos) {
                this.targetIndex++;
                if (this.targetIndex >= this.targets.length) {
                    this.targetIndex = 0;
                }
                this.lastSwitchNanos = now;
            }
        }

        this.setupTick = !this.setupTick;
    },

    onMove: function(event) {
        if (!this.customMotionPending) {
            return;
        }

        var player = mc.thePlayer;
        if (player == null || mc.theWorld == null) {
            this.customMotionPending = false;
            return;
        }

        try {
            var currentY = event.getY();
            event.setY(currentY + this.customMotionY);
            this.customMotionPending = false;
            this.customMotionApplied = true;
        } catch (e) {
            this.customMotionPending = false;
            if (!this.moveErrorShown) {
                this.moveErrorShown = true;
                ClientUtils.displayChatMessage(
                    "§cCAura MoveEvent error: " + e
                );
            }
        }
    },

    showArmorDurability: function(target) {
        if (!(target instanceof EntityPlayer)) {
            this.duraTargetId = -1;
            return;
        }

        var targetId = target.getEntityId();
        if (this.duraTargetId === targetId) {
            return;
        }
        this.duraTargetId = targetId;

        var inventory;

        try {
            inventory = target.getInventory();
        } catch (e) {
            return;
        }

        if (inventory == null) {
            this.duraTargetId = -1;
            return;
        }

        if (duraHelmetValue.get() && inventory[3] != null) {
            ClientUtils.displayChatMessage(
                "CAura Helmet: " +
                (inventory[3].getMaxDamage() -
                 inventory[3].getItemDamage())
            );
        }

        if (duraChestValue.get() && inventory[2] != null) {
            ClientUtils.displayChatMessage(
                "CAura Chestplate: " +
                (inventory[2].getMaxDamage() -
                 inventory[2].getItemDamage())
            );
        }

        if (duraLegsValue.get() && inventory[1] != null) {
            ClientUtils.displayChatMessage(
                "CAura Leggings: " +
                (inventory[1].getMaxDamage() -
                 inventory[1].getItemDamage())
            );
        }

        if (duraBootsValue.get() && inventory[0] != null) {
            ClientUtils.displayChatMessage(
                "CAura Boots: " +
                (inventory[0].getMaxDamage() -
                 inventory[0].getItemDamage())
            );
        }
    },

    updateTag: function() {
        if (this.module == null) {
            return;
        }

        try {
            this.module.tag = this.target == null
                ? ""
                : this.target.getName();
        } catch (e) {}
    },

    onMotion: function(event) {
        var player = mc.thePlayer;

        if (player == null ||
            mc.theWorld == null ||
            mc.currentScreen != null) {
            return;
        }

        var state = String(event.getEventState());

        if (state === "PRE") {
            this.offsetLastPacketAura = false;
            this.updateTargets(player);

            if (this.customMotionApplied) {
                this.customMotionApplied = false;
                if (this.target != null && this.isValid(this.target, player)) {
                    this.pendingCriticalTarget = this.target;
                    this.pendingCriticalAge = 0;
                }
            } else if (this.pendingCriticalTarget != null) {
                this.pendingCriticalAge++;
            }

            if (this.target != null) {
                RotationUtils.setTargetRotation(
                    this.getRotations(player, this.target)
                );

                this.sendStartBlock(player);
                this.showArmorDurability(this.target);
            } else {
                try {
                    RotationUtils.reset();
                } catch (e) {}
            }

            this.prepareCustomMotion(player);
            this.updateTag();
            return;
        }

        if (state === "POST") {
            var attackTarget = null;

            if (criticalsValue.get() && this.pendingCriticalTarget != null) {
                var fallingForCritical =
                    !player.onGround &&
                    player.fallDistance > 0.0 &&
                    player.fallDistance <= fallDistanceValue.get();

                if (fallingForCritical || this.pendingCriticalAge >= 3) {
                    attackTarget = this.pendingCriticalTarget;
                    this.pendingCriticalTarget = null;
                    this.pendingCriticalAge = 0;
                }
            } else if (this.attackThisTick && this.target != null) {
                attackTarget = this.target;
            }

            if (attackTarget != null && this.isValid(attackTarget, player)) {
                if (player.isBlocking()) {
                    this.sendReleaseBlock();
                }

                this.attack(attackTarget, player);

                if (player.isBlocking()) {
                    this.sendReblock(player);
                }
            }
        }
    },

    onUpdate: function() {
        var player = mc.thePlayer;

        if (player == null || mc.theWorld == null) {
            return;
        }

        if (this.pendingJump && !this.offsetLastPacketAura) {
            this.pendingJump = false;
            player.jump();
        }
    },

    onJump: function(event) {
        if (this.offsetLastPacketAura) {
            this.pendingJump = true;
            event.cancelEvent();
        }
    },

    attack: function(target, player) {
        try {
            var AttackEvent = Java.type(
                "net.ccbluex.liquidbounce.event.AttackEvent"
            );

            LiquidBounce.eventManager.callEvent(
                new AttackEvent(target)
            );
        } catch (e) {}

        if (!noSwingValue.get()) {
            player.swingItem();
        }

        this.sendPacket(
            new C02PacketUseEntity(
                target,
                C02Action.ATTACK
            )
        );
    },

    onDisable: function() {
        var player = mc.thePlayer;

        if (player != null && player.isBlocking()) {
            this.sendReleaseBlock();
        }

        this.pendingJump = false;
        this.customMotionPending = false;
        this.offsetLastPacketAura = false;
        this.reset();
    }
};

script.registerModule({
    name: "CAura",
    description: "CAura with real vertical CustomMotion through MoveEvent for LiquidBounce b73",
    category: "Combat",

    settings: {
        Range: rangeValue,
        WallsRange: wallRangeValue,
        MinTargetAge: minAgeValue,
        FallDistance: fallDistanceValue,
        SwitchTimer: switchTimerValue,
        YOffset1: criticalOffset1Value,
        YOffset2: criticalOffset2Value,
        YOffset3: criticalOffset3Value,

        Players: playersValue,
        Monsters: monstersValue,
        Golems: golemsValue,
        Animals: animalsValue,
        Bats: batsValue,
        Villagers: villagersValue,
        AttackFriends: attackFriendsValue,
        ArmorCheck: armorCheckValue,

        Criticals: criticalsValue,
        AutoBlock: autoBlockValue,
        NoSlowdown: noSlowdownValue,
        NoSwing: noSwingValue,

        DuraHelmet: duraHelmetValue,
        DuraChestplate: duraChestValue,
        DuraLeggings: duraLegsValue,
        DuraBoots: duraBootsValue
    }
}, function(module) {
    aura.module = module;

    module.on("enable", function() {
        aura.reset();
    });

    module.on("disable", function() {
        aura.onDisable();
    });

    module.on("motion", function(event) {
        aura.onMotion(event);
    });

    module.on("move", function(event) {
        aura.onMove(event);
    });

    module.on("update", function() {
        aura.onUpdate();
    });

    module.on("jump", function(event) {
        aura.onJump(event);
    });
});