//constants.js
const WIDTH = 900, HEIGHT = 600, FLOOR = HEIGHT - 30, PLATFORM_HEIGHT = 20;
const PLAYER_SIZE = 54, PLAYER_SPEED = 5, GRAVITY = 0.7, FRICTION = 0.7;
const JUMP_VEL = 15, MAX_JUMPS = 2, DASH_FRAMES = 8, DASH_SPEED = 13, DASH_COOLDOWN = 36;
const BLOCK_MAX = 100, BLOCK_DEPLETION = 1.8, BLOCK_RECOVERY = 0.8, SLOW_FALL_MULTIPLIER = 0.16;
const BLOCK_PUSHBACK_X = 9, BLOCK_PUSHBACK_Y = -4;
const MAX_POINTS = 5;
const BLOCK_POINT_REWARD = 1;
const SMASH_POINT_COST = 1;
const platforms = [
  { x: WIDTH / 2 - 70, y: FLOOR - 90, w: 140 },
  { x: WIDTH / 4 - 60, y: FLOOR - 180, w: 120 },
  { x: 3 * WIDTH / 4 - 60, y: FLOOR - 180, w: 120 },
  { x: 60, y: FLOOR - 60, w: 120 },
  { x: WIDTH - 180, y: FLOOR - 60, w: 120 }
];

//utils.js
function log(msg) {
  const logDiv = document.getElementById("game-log");
  if (!logDiv) return;
  logDiv.innerHTML += `<div>${msg}</div>`;
  let lines = logDiv.children;
  if (lines.length > 50) logDiv.removeChild(lines[0]);
  logDiv.scrollTop = logDiv.scrollHeight;
}

function setHealth(player, value) {
  player.hp = Math.max(0, Math.min(100, value));
}

function healToFull(player) {
  player.hp = 100;
}

function setPosition(player, x, y) {
  player.x = x;
  player.y = y;
}

function addBlock(player, amount) {
  player.block = Math.min(BLOCK_MAX, player.block + amount);
}

function reduceBlock(player, amount) {
  player.block = Math.max(0, player.block - amount);
}

function resetDashCooldown(player) {
  player.dashCooldown = 0;
}

function setParalyzed(player, duration) {
  player.isParalyzed = true;
  player.paralyzeTimer = duration;
  player.movement = false;
}

function knockback(attacker, defender, strengthX, strengthY) {
  defender.vx = (defender.x < attacker.x ? -1 : 1) * Math.abs(strengthX);
  defender.vy = strengthY;
}

function isBlockingProperly(blocker, attacker) {
  return blocker.blocking && blocker.block > 0 && (blocker.facing === -attacker.facing);
}

function handleDashDmg(attacker, victim, dmg) {
  attacker.dashdmg = dmg; // assign unique identifier for this dash hit
  victim.hp -= dmg;
  if (victim.hp < 0) victim.hp = 0;
  victim.justHit = 10;
  log(attacker.name + " hit " + victim.name + " with DASH for " + dmg + " damage (dashdmg=" + attacker.dashdmg + ")");
}

function getControls(pid) {
  return pid === 0
    ? { left: 'a', right: 'd', up: 'w', down: 's', special: 'e' }
    : { left: 'k', right: ';', up: 'o', down: 'l', special: 'p' };
}

// start of point functions
function points(player, amount) {
  player.points = Math.max(0, Math.min(MAX_POINTS, player.points + amount));
  return player.points;
}
// end of point functions

// In utils.js - Add this function
function createPlaceholderSprite(color, frameCount, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width * frameCount;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  for (let i = 0; i < frameCount; i++) {
    ctx.fillStyle = color;
    ctx.fillRect(i * width, 0, width, height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(i * width + 2, 2, width - 4, height - 4);
    
    // Add frame number
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(i+1, i * width + width/2, height/2 + 7);
  }
  
  return canvas.toDataURL();
}

//animation.js
// Animation system for sprite-based character animations
const AnimationSystem = {
  // Cache for loaded images to avoid reloading
  imageCache: {},
  
  // Load an image and cache it
  loadImage: function(src) {
    if (!this.imageCache[src]) {
      const img = new Image();
      img.src = src;
      this.imageCache[src] = img;
    }
    return this.imageCache[src];
  },
  
  // Create a new animation
  createAnimation: function(config) {
    return {
      name: config.name || 'unnamed',
      spriteSheet: this.loadImage(config.src),
      frameCount: config.frameCount || 1,
      frameDuration: config.frameDuration || 100, // ms per frame
      frameWidth: config.frameWidth,
      frameHeight: config.frameHeight,
      loop: config.loop !== undefined ? config.loop : true,
      autoPlay: config.autoPlay !== undefined ? config.autoPlay : true,
      startFrame: config.startFrame || 0,
      row: config.row || 0, // For sprite sheets with multiple rows
      currentFrame: 0,
      lastFrameTime: 0,
      isPlaying: false,
      isFinished: false,
      flipX: config.flipX || false,
      onComplete: config.onComplete || null
    };
  },
  
  // Create an animation controller for a character
  createAnimationController: function() {
    return {
      animations: {},
      currentAnimation: null,
      
      // Add an animation to this controller
      add: function(animation) {
        this.animations[animation.name] = animation;
        // If this is the first animation, set it as current
        if (!this.currentAnimation) {
          this.currentAnimation = animation.name;
          if (animation.autoPlay) {
            animation.isPlaying = true;
            animation.lastFrameTime = performance.now();
          }
        }
        return this;
      },
      
      // Play a specific animation
      play: function(name, reset = true) {
        if (this.animations[name]) {
          // Don't restart if already playing this animation unless reset=true
          if (this.currentAnimation === name && !reset) {
            return;
          }
          
          const prevAnim = this.currentAnimation;
          this.currentAnimation = name;
          
          const anim = this.animations[name];
          if (reset) {
            anim.currentFrame = anim.startFrame;
            anim.isFinished = false;
          }
          anim.isPlaying = true;
          anim.lastFrameTime = performance.now();
          
          return prevAnim;
        }
        return null;
      },
      
      // Stop the current animation
      stop: function() {
        if (this.currentAnimation) {
          this.animations[this.currentAnimation].isPlaying = false;
        }
      },
      
      // Update the animation state
      update: function() {
        if (!this.currentAnimation) return;
        
        const anim = this.animations[this.currentAnimation];
        if (!anim.isPlaying || anim.isFinished) return;
        
        const now = performance.now();
        const elapsed = now - anim.lastFrameTime;
        
        if (elapsed >= anim.frameDuration) {
          // Calculate how many frames to advance (for variable framerates)
          const framesToAdvance = Math.floor(elapsed / anim.frameDuration);
          anim.currentFrame += framesToAdvance;
          anim.lastFrameTime = now - (elapsed % anim.frameDuration);
          
          // Handle loop or completion
          if (anim.currentFrame >= anim.frameCount) {
            if (anim.loop) {
              anim.currentFrame %= anim.frameCount;
            } else {
              anim.currentFrame = anim.frameCount - 1;
              anim.isPlaying = false;
              anim.isFinished = true;
              if (anim.onComplete) anim.onComplete();
            }
          }
        }
      },
      
      // Draw the current animation frame
      draw: function(ctx, x, y, facing) {
        if (!this.currentAnimation) return;
        
        const anim = this.animations[this.currentAnimation];
        const spriteSheet = anim.spriteSheet;
        
        // Don't try to draw if the image isn't loaded yet
        if (!spriteSheet.complete) return;
        
        try {
          const frameX = (anim.currentFrame % anim.frameCount) * anim.frameWidth;
          const frameY = anim.row * anim.frameHeight;
          
          ctx.save();
          
          // Handle facing direction and flip if needed
          if ((facing === -1 && !anim.flipX) || (facing === 1 && anim.flipX)) {
            ctx.translate(x + anim.frameWidth, y);
            ctx.scale(-1, 1);
            ctx.drawImage(
              spriteSheet,
              frameX, frameY, anim.frameWidth, anim.frameHeight,
              0, 0, anim.frameWidth, anim.frameHeight
            );
          } else {
            ctx.drawImage(
              spriteSheet, 
              frameX, frameY, anim.frameWidth, anim.frameHeight,
              x, y, anim.frameWidth, anim.frameHeight
            );
          }
          
          ctx.restore();
        } catch (error) {
          // If drawing fails, draw a colored rectangle instead
          ctx.fillStyle = "#808080";
          ctx.fillRect(x, y, anim.frameWidth || PLAYER_SIZE, anim.frameHeight || PLAYER_SIZE);
        }
      },
      
      // Check if current animation is finished
      isFinished: function() {
        if (!this.currentAnimation) return true;
        return this.animations[this.currentAnimation].isFinished;
      },
      
      // Get current animation name
      getCurrent: function() {
        return this.currentAnimation;
      }
    };
  }
};

// 1. Base Character System (Keep your existing system)
//characters.js
const JUDGEMENT_CUT_CONSTANTS = {
    SLIDE_DURATION: 5000,
    SLIDE_SPEED: 1,
    FALL_INITIAL_VY: -7,
    FALL_VX_RANGE: 3,
    LINE_DISPLAY_DURATION: 1100,
    LINE_APPEAR_INTERVAL: 50,  // Time between each line appearing (ms)
    FIRST_THREE_INTERVAL: 50,  // Slower interval for first 3 lines
    REMAINING_LINES_DELAY: 200  // Extra delay before remaining lines appear together
};

const CharacterSystem = {
    characters: {},
    
    register: function(id, config) {
        // Merge with base character template
        this.characters[id] = {
            ...BaseCharacter,
            ...config,
            abilities: {
                ...BaseCharacter.abilities,
                ...config.abilities
            }
        };
        console.log(`Character '${id}' registered`);
    },
    
    get: function(id) {
        return this.characters[id] || this.characters['default'];
    },
    
    applyTo: function(player, charId) {
        const character = this.get(charId);
        
        // Set basic character properties
        player.charId = charId;
        player.color = character.color || "#42a5f5";
        
        // Initialize animation controller if sprites are defined
        if (character.sprites) {
            player.animations = AnimationSystem.createAnimationController();
            
            // Add each animation from the sprites configuration
            Object.keys(character.sprites).forEach(animName => {
                const animConfig = character.sprites[animName];
                player.animations.add(AnimationSystem.createAnimation({
                    name: animName,
                    src: animConfig.src,
                    frameCount: animConfig.frameCount || 1,
                    frameDuration: animConfig.frameDuration || 100,
                    frameWidth: animConfig.frameWidth || PLAYER_SIZE,
                    frameHeight: animConfig.frameHeight || PLAYER_SIZE,
                    loop: animConfig.loop !== undefined ? animConfig.loop : true,
                    autoPlay: animConfig.autoPlay !== undefined ? animConfig.autoPlay : (animName === 'idle'),
                    row: animConfig.row || 0,
                    flipX: animConfig.flipX || false,
                    onComplete: animConfig.onComplete || null
                }));
            });
            
            // Add animation helpers
            player.setAnimation = function(state) {
                if (this.animations && this.animations.animations[state]) {
                    this.animations.play(state);
                    return true;
                }
                return false;
            };
            
            player.updateAnimation = function() {
                if (this.animations) {
                    this.animations.update();
                }
            };
        }
        
        // Apply character initialization if available
        if (character.init) {
            character.init(player);
        }
        
        // Apply custom update method if available
        if (character.update) {
            player.characterUpdate = character.update;
        }
        
        // Apply ability methods
        player.keyPress = function(key, pressCount) {
            if (!this.movement) return;
            if (character.abilities.keyPress) {
                character.abilities.keyPress.call(this, key, pressCount);
            }
        };
        
        player.keyPresses = function(key, count) {
            if (!this.movement) return;
            if (character.abilities.keyPresses) {
                character.abilities.keyPresses.call(this, key, count);
            }
        };
        
        player.keyHold = function(key, duration) {
            if (character.abilities.keyHold) {
                character.abilities.keyHold.call(this, key, duration);
            }
        };
        
        player.keyRelease = function(key, duration) {
            this.chargingLogged[key] = false;
            if (character.abilities.keyRelease) {
                character.abilities.keyRelease.call(this, key, duration);
            }
        };
        
        // Apply render method
        player.render = character.render || function(ctx) {
            if (this.animations) {
                this.animations.draw(ctx, this.x, this.y, this.facing);
            } else {
                ctx.fillStyle = this.color;
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 3;
                ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.strokeRect(this.x, this.y, this.w, this.h);
            }
        };


        
        return player;
    }
};

// 2. Base Character Template
const BaseCharacter = {
    name: "Unknown",
    color: "#808080",
    abilities: {
        keyPresses: function(key, count) {
            const controls = getControls(this.id);
            if ((key === controls.right || key === controls.left) && count === 2 && this.dashCooldown === 0) {
                AbilityLibrary.dash(this, key === controls.right ? 1 : -1);
            }
        }
    }
};

// 3. Ability Library (New Addition)

const AbilityLibrary = {
    // Your existing abilities
//judgementcutend ability
judgementCut: function(character, costPoints = 0) {
    if (character.points < costPoints || character.judgementCutCooldown > 0) return false;
    
   
    
    // Zoom
    startCameraZoomEffect();
    
    // Get current camera state
    const { cx, cy, zoom } = getCamera();
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    
    // Create effect canvas if it doesn't exist
    if (!character.effectCanvas) {
        character.effectCanvas = document.createElement('canvas');
        character.effectCtx = character.effectCanvas.getContext('2d');
    }
    
    // Set effect canvas to camera view size
    character.effectCanvas.width = viewW;
    character.effectCanvas.height = viewH;
    
    // Points cost
    points(character, -costPoints);
    
    // Set cooldown
    character.judgementCutCooldown = 120;
    
    // STEP 1: Show lines immediately
    const effect = {
        lines: [
            //sequence line
           [0, viewH * 0.07, viewW, viewH * 0.82],
            [0, viewH * 0.29, viewW, viewH],
            [0, viewH * 0.52, viewW * 0.82, viewH],
            [0, viewH * 0.88, viewW, viewH * 0.8],
            [0, viewH * 0.92, viewW, viewH * 0.51],
            [viewW * 0.16, 0, viewW, viewH],
            [viewW * 0.22, 0, viewW, viewH * 0.73],
            [viewW * 0.3, 0, viewW, viewH * 0.48],
            [0, viewH * 0.2, viewW, viewH * 0.08],
            [0, viewH * 0.12, viewW, viewH * 0.45],
            [0, viewH * 0.55, viewW, viewH * 0.23],
            [0, viewH * 0.75, viewW, viewH * 0.19],
            [0, viewH * 0.2, viewW * 0.55, viewH],
            [0, viewH, viewW, viewH * 0.25],
            [viewW * 0.73, 0, viewW, viewH],
            [viewW, 0, viewW * 0.34, viewH],
            [viewW, 0, viewW * 0.03, viewH],
        ],
        phase: 'lines',
        damage: 35,
        range: 500,
        cameraX: cx - viewW / 2,
        cameraY: cy - viewH / 2,
        viewWidth: viewW,
        viewHeight: viewH,
        shards: [],
        visibleLines: 0
    };
    
    // Store effect in character
    character.judgementCutEffect = effect;
    
    //This is the line where the white lines appears one by onehahah
    for (let i = 0; i < 7; i++) {
        setTimeout(() => {
            if (character.judgementCutEffect && character.judgementCutEffect.phase === 'lines') {
                character.judgementCutEffect.visibleLines = i + 1;
            }
        }, i * JUDGEMENT_CUT_CONSTANTS.FIRST_THREE_INTERVAL);
    }
    
    // lines to appear all at once after delay
    setTimeout(() => {
        if (character.judgementCutEffect && character.judgementCutEffect.phase === 'lines') {
            character.judgementCutEffect.visibleLines = effect.lines.length;
        }
    }, 3 * JUDGEMENT_CUT_CONSTANTS.FIRST_THREE_INTERVAL + JUDGEMENT_CUT_CONSTANTS.REMAINING_LINES_DELAY);
    
    // STEP 2: After lines display duration, hide lines and prepare shards
    setTimeout(() => {
        if (character.judgementCutEffect) {
            character.judgementCutEffect.phase = 'preparing'; // Hide lines, prepare shards
            
            // Generate shards but don't show them yet
            const helpers = {
                lineSide: function(line, pt) {
                    const [x1,y1,x2,y2] = line;
                    return (x2-x1)*(pt[1]-y1)-(y2-y1)*(pt[0]-x1);
                },
                
                segLineIntersection: function(a, b, line) {
                    const [x1,y1,x2,y2] = line;
                    const x3 = a[0], y3 = a[1], x4 = b[0], y4 = b[1];
                    const denom = (x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
                    if (Math.abs(denom)<1e-8) return null;
                    const px = ((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/denom;
                    const py = ((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/denom;
                    const between = (a,b,c) => a>=Math.min(b,c)-1e-6 && a<=Math.max(b,c)+1e-6;
                    if (between(px,a[0],b[0])&&between(py,a[1],b[1])) return [px,py];
                    return null;
                },
                
                splitPolygonByLine: function(poly, line) {
                    let left=[], right=[];
                    for (let i=0;i<poly.length;++i) {
                        let a = poly[i], b = poly[(i+1)%poly.length];
                        let aside = this.lineSide(line, a);
                        let bside = this.lineSide(line, b);
                        if (aside >= 0) left.push(a);
                        if (aside <= 0) right.push(a);
                        if ((aside > 0 && bside < 0) || (aside < 0 && bside > 0)) {
                            let ipt = this.segLineIntersection(a, b, line);
                            if (ipt) { left.push(ipt); right.push(ipt); }
                        }
                    }
                    if (left.length>2) {
                        left = left.filter((p,i,arr)=>
                            i==0||Math.abs(p[0]-arr[i-1][0])>1e-5||Math.abs(p[1]-arr[i-1][1])>1e-5
                        );
                    } else left = null;
                    if (right.length>2) {
                        right = right.filter((p,i,arr)=>
                            i==0||Math.abs(p[0]-arr[i-1][0])>1e-5||Math.abs(p[1]-arr[i-1][1])>1e-5
                        );
                    } else right = null;
                    return [left, right];
                },
                
                shatterPolygons: function(lines) {
                    let initial = [[ [0,0], [WIDTH,0], [WIDTH,HEIGHT], [0,HEIGHT] ]];
                    for (let line of lines) {
                        let next = [];
                        for (let poly of initial) {
                            let [left, right] = this.splitPolygonByLine(poly, line);
                            if (left) next.push(left);
                            if (right) next.push(right);
                        }
                        initial = next;
                    }
                    return initial;
                }
            };
            
            const polys = helpers.shatterPolygons.call(helpers, effect.lines);
            character.judgementCutEffect.shards = polys.map(poly => {
                let cx=0, cy=0;
                for (let p of poly) { cx+=p[0]; cy+=p[1]; }
                cx/=poly.length; cy/=poly.length;
                
                let dir = Math.random() < 0.5 ? -0.8 : 0.8;
                return {
                    poly,
                    x: 0, y: 0,
                    vx: dir * (18 + Math.random()*10),
                    vy: (Math.random()-0.5)*10,
                    g: 1.10 + Math.random()*0.2,
                    angle: (Math.random()-0.5)*0.2,
                    vangle: (Math.random()-0.5)*0.12 + (cx-effect.viewWidth/2)*0.0003
                };
            });
        }
    }, JUDGEMENT_CUT_CONSTANTS.LINE_DISPLAY_DURATION);
    
    //shard anim
    setTimeout(() => {
        if (character.judgementCutEffect) {
            character.judgementCutEffect.phase = 'slide';
            character.judgementCutEffect.startTime = performance.now();
            
           
        }
    }, JUDGEMENT_CUT_CONSTANTS.LINE_DISPLAY_DURATION + 500);
    
    // Deal damage to opponents in range (immediate)
    for (let i = 0; i < players.length; i++) {
        const opponent = players[i];
        if (opponent !== character && opponent.alive) {
            const dx = opponent.x - character.x;
            const dy = opponent.y - character.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < effect.range) {
                const damageMultiplier = 1 - (distance / effect.range);
                const damage = Math.round(effect.damage * damageMultiplier);
                opponent.hp -= damage;
                opponent.justHit = 10;
                knockback(character, opponent, effect.knockback.x, effect.knockback.y);
                log(`${character.name}'s Judgement Cut hit ${opponent.name} for ${damage} damage!`);
            }
        }
    }
    
    return true;
},
};

// 4. Character Definitions (Updated with new structure)
CharacterSystem.register('default', {
    ...BaseCharacter,
    name: "Fighter"
});

CharacterSystem.register('vergil', {
    ...BaseCharacter,
    name: "Vergil",
    color: "#4a90e2",
    
    init: function(player) {
    player.judgementCutCooldown = 0;
    player.effectCanvas = null;
    player.effectCtx = null;
    player.snapCanvas = null;
    player.snapCtx = null;
    player.judgementCutEffect = null;
    
    // NEW: Add teleport dash properties
    player.teleportTrail = null;
    player.isTeleporting = false;
    player.teleportAlpha = 1.0;
    
    // NEW: Add teleport jump properties
  
    player.teleportJumpCooldown = 0;
},
    
update: function() {
    if (this.judgementCutCooldown > 0) {
        this.judgementCutCooldown--;
    }
    
    // NEW: Handle teleport effects
    if (this.teleportTrail && this.teleportTrail.duration > 0) {
        this.teleportTrail.duration--;
        this.teleportTrail.alpha *= 0.92;  // Fade out trail
        if (this.teleportTrail.duration <= 0) {
            this.teleportTrail = null;
        }
    }
    
    // NEW: Handle teleport transparency
 // NEW: Handle teleport transparency (same for both dash and jump)
if (this.isTeleporting) {
    if (this.dash > 0) {
        // Still dashing - keep semi-transparent and flickering
        this.teleportAlpha = 0.2 + 0.3 * Math.sin(performance.now() / 50);
    } else {
        // Dash finished - fade back to normal
        this.teleportAlpha += 0.15;
        if (this.teleportAlpha >= 1.0) {
            this.teleportAlpha = 1.0;
            this.isTeleporting = false;
        }
    }
}

// NEW: Handle teleport jump cooldown
if (this.teleportJumpCooldown > 0) {
    this.teleportJumpCooldown--;
}

    if (this.judgementCutEffect) {
        const effect = this.judgementCutEffect;
        
        // Only handle slide and fall phases (lines and preparing are handled by setTimeout)
        if (effect.phase === 'slide') {
            const t = performance.now() - effect.startTime;
            
            for (let s of effect.shards) {
                s.x += s.vx * JUDGEMENT_CUT_CONSTANTS.SLIDE_SPEED;
                s.y += s.vy * JUDGEMENT_CUT_CONSTANTS.SLIDE_SPEED;
                s.angle += s.vangle * JUDGEMENT_CUT_CONSTANTS.SLIDE_SPEED;
            }
            
            if (t > JUDGEMENT_CUT_CONSTANTS.SLIDE_DURATION) {
                effect.phase = 'fall';
                
                for (let s of effect.shards) {
                    s.vy = JUDGEMENT_CUT_CONSTANTS.FALL_INITIAL_VY + Math.random()*2;
                    s.vx = (Math.random()-0.5) * JUDGEMENT_CUT_CONSTANTS.FALL_VX_RANGE;
                }
            }
        } else if (effect.phase === 'fall') {
            for (let s of effect.shards) {
                s.x += s.vx;
                s.y += s.vy;
                s.vy += s.g;
                s.angle += s.vangle;
            }
            const maxY = effect.viewHeight + 100;
            if (effect.shards.every(s => s.y > maxY)) {
                this.judgementCutEffect = null;
            }
        }
        // 'lines' and 'preparing' phases don't need animation updates
    }
},
    
 render: function(ctx) {
    // NEW: Draw teleport trail first (behind character)

if (this.teleportTrail && this.teleportTrail.duration > 0) {
    ctx.save();
    ctx.globalAlpha = this.teleportTrail.alpha;
    ctx.fillStyle = "#1a1a2e";  // Dark blue shadow color
    ctx.fillRect(this.teleportTrail.x, this.teleportTrail.y, this.w, this.h);
    
    // Add some blue glow to the trail
    ctx.strokeStyle = "#4a90e2";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.teleportTrail.x, this.teleportTrail.y, this.w, this.h);
    ctx.restore();
}

// NEW: Draw teleport jump trail
if (this.teleportJumpTrail && this.teleportJumpTrail.duration > 0) {
    ctx.save();
    ctx.globalAlpha = this.teleportJumpTrail.alpha;
    ctx.fillStyle = "#0f0f1a";  // Even darker blue for jump
    ctx.fillRect(this.teleportJumpTrail.x, this.teleportJumpTrail.y, this.w, this.h);
    
    // Add purple glow for jump trail
    ctx.strokeStyle = "#6a4c93";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.teleportJumpTrail.x, this.teleportJumpTrail.y, this.w, this.h);
    
    // Add upward motion lines
    for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = "#6a4c93";
        ctx.lineWidth = 1;
        ctx.globalAlpha = this.teleportJumpTrail.alpha * 0.5;
        ctx.beginPath();
        ctx.moveTo(this.teleportJumpTrail.x + this.w/2 - 10 + i*10, this.teleportJumpTrail.y + this.h);
        ctx.lineTo(this.teleportJumpTrail.x + this.w/2 - 10 + i*10, this.teleportJumpTrail.y + this.h + 15);
        ctx.stroke();
    }
    ctx.restore();
}
    
    // Draw the main character with teleport transparency
    ctx.save();
    ctx.globalAlpha = this.teleportAlpha;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    
    // NEW: Add teleport effect particles when teleporting
   // NEW: Add teleport effect particles when teleporting or jumping
if ((this.isTeleporting && this.dash > 0) || this.isTeleportJumping) {
    // Draw some "shadow particles" around Vergil
    for (let i = 0; i < 4; i++) {
        const offsetX = (Math.random() - 0.5) * 25;
        const offsetY = (Math.random() - 0.5) * 25;
        ctx.globalAlpha = 0.4 * Math.random();
        
        if (this.isTeleportJumping) {
            // Purple particles for teleport jump
            ctx.fillStyle = "#6a4c93";
        } else {
            // Blue particles for teleport dash
            ctx.fillStyle = "#1a1a2e";
        }
        
        ctx.fillRect(this.x + offsetX, this.y + offsetY, 6, 6);
    }
    
    // Add extra upward particles when teleport jumping
    if (this.isTeleportJumping) {
        for (let i = 0; i < 2; i++) {
            const offsetX = (Math.random() - 0.5) * 15;
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = "#9d4edd";
            ctx.fillRect(this.x + this.w/2 + offsetX, this.y + this.h + Math.random() * 10, 4, 8);
        }
    }
}
    
    ctx.restore();
},
    
abilities: {
    keyPress: function(key) {
        const controls = getControls(this.id);
        if (key === controls.special) {
             pauseGame('judgement_cut');
            // Get current camera state
            const { cx, cy, zoom } = getCamera();
            
            // Calculate camera view dimensions
            const viewW = canvas.width / zoom;
            const viewH = canvas.height / zoom;
            
            // Create snapshot canvas to match the camera view size
            if (!this.snapCanvas) {
                this.snapCanvas = document.createElement('canvas');
                this.snapCtx = this.snapCanvas.getContext('2d');
            }
            
            // Set snapshot canvas to camera view size
            this.snapCanvas.width = viewW;
            this.snapCanvas.height = viewH;
            
            // Calculate what area of the world is visible
            const viewLeft = cx - viewW / 2;
            const viewTop = cy - viewH / 2;
            
            // Take snapshot of only the visible camera area
            this.snapCtx.clearRect(0, 0, viewW, viewH);
            this.snapCtx.save();
            
            // Translate to show only the camera view area
            this.snapCtx.translate(-viewLeft, -viewTop);
            
            // BACKGROUND
            this.snapCtx.fillStyle = "#181c24";
            this.snapCtx.fillRect(0, 0, WIDTH, HEIGHT);
            this.snapCtx.fillStyle = "#6d4c41";
            this.snapCtx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);

            // PLATFORMS
            platforms.forEach(p => {
                this.snapCtx.fillStyle = "#ffd54f";
                this.snapCtx.fillRect(p.x, p.y, p.w, PLATFORM_HEIGHT);
                this.snapCtx.strokeStyle = "#ffb300";
                this.snapCtx.lineWidth = 3;
                this.snapCtx.strokeRect(p.x, p.y, p.w, PLATFORM_HEIGHT);
            });

            // PLAYERS
            for (let p of players) {
                if (!p.alive) continue;
                
                // Draw shadow
                this.snapCtx.globalAlpha = 0.18;
                this.snapCtx.beginPath();
                this.snapCtx.ellipse(p.x + p.w / 2, p.y + p.h - 4, p.w / 2.5, 7, 0, 0, 2 * Math.PI);
                this.snapCtx.fillStyle = "#000";
                this.snapCtx.fill();
                this.snapCtx.globalAlpha = 1;
                
                // Draw player body
                this.snapCtx.fillStyle = p.color;
                this.snapCtx.strokeStyle = "#fff";
                this.snapCtx.lineWidth = 3;
                this.snapCtx.fillRect(p.x, p.y, p.w, p.h);
                this.snapCtx.strokeRect(p.x, p.y, p.w, p.h);
            }
            
            this.snapCtx.restore();
            
            // ADD DELAY HERE - Trigger the effect after 2 seconds
          
              setTimeout(() => {
                AbilityLibrary.judgementCut(this);
            }, 2000);
            setTimeout(()=>{
                 // RESUME THE GAME when shards start falling
            resumeGame();
            },9000)
        }
    },
    
    // NEW: Add teleport dash function
   keyPresses: function(key, count) {
    const controls = getControls(this.id);
    
    // Teleport dash on double tap left/right
    if ((key === controls.left || key === controls.right) && count === 2 && this.dashCooldown === 0) {
        const direction = key === controls.right ? 1 : -1;
        
        // Create teleport trail at current position
        this.teleportTrail = {
            x: this.x,
            y: this.y,
            duration: 15,  // Shorter than fire trail
            alpha: 0.8
        };
        
        // Start teleport effect
        this.isTeleporting = true;
        this.teleportAlpha = 0.3;  // Make Vergil semi-transparent
        
        // Enhanced dash with teleport distance
        this.vx = direction * DASH_SPEED *1.2;  // 50% faster than normal dash
        this.dash = DASH_FRAMES;
        this.dashCooldown = DASH_COOLDOWN;
        
        log(`${this.name} teleports through the shadows!`);
    }
    
    // NEW: Teleport jump on double tap up
   // NEW: Teleport jump on double tap up
if (key === controls.up && count === 2 && this.teleportJumpCooldown === 0) {
    // Create teleport trail at current position (same as dash)
    this.teleportTrail = {
        x: this.x,
        y: this.y,
        duration: 15,
        alpha: 0.8
    };
    
    // Start teleport effect (same as dash)
    this.isTeleporting = true;
    this.teleportAlpha = 0.3;
    
    // Enhanced jump
    this.vy = -JUMP_VEL * 1.1;
    this.jumps++;
    this.teleportJumpCooldown = 60;
    
    log(`${this.name} teleports upward!`);
}
}
}
});

//game.js
let cameraZoomEffect = {
    active: false,
    startZoom: 1,
    targetZoom: 1.5,  // Zoom in to 1.5x during the effect
    currentZoom: 1,
    phase: 'idle',    // 'zoom_in', 'hold', 'zoom_out'
    startTime: 0,
    duration: {
        zoomIn: 6300,   // 800ms to zoom in slowly
        hold: 400,     // Hold the zoom for 400ms during slide
        zoomOut: 700   // 600ms to zoom back out
    }
};
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Add this after the cameraZoomEffect object (around line 16)
let gameState = {
    paused: false,
    pauseReason: null, // 'judgement_cut' or null
    pauseStartTime: 0
};

// Add these functions after the cameraZoomEffect object
function pauseGame(reason) {
    gameState.paused = true;
    gameState.pauseReason = reason;
    gameState.pauseStartTime = performance.now();
    log("Game paused for " + reason);
}

function resumeGame() {
    gameState.paused = false;
    gameState.pauseReason = null;
    log("Game resumed");
}

// Player factory function with character system integration
// In game.js - modify createPlayer function to include points
function createPlayer(x, y, facing, playerName, charId, playerId) {
  const player = {
    x: x, y: y, vx: 0, vy: 0, w: PLAYER_SIZE, h: PLAYER_SIZE,
    facing: facing, hp: 100, jumps: 0, dash: 0, dashCooldown: 0,
    block: BLOCK_MAX, blocking: false, onGround: false, jumpHeld: false, alive: true,
    id: playerId, name: playerName,
    points: 0, 
    justHit: 0, hasDashHit: false, lastTapDir: null, lastTapTime: 0,
    lastReleaseTime: { left: 0, right: 0 }, _wasBlocking: false,
    dizzy: 0, isParalyzed: false, paralyzeTimer: 0,
    movement: true,
    chargingLogged: {},
    dashdmg: 0
  };
  
  // Apply character abilities and properties
  return CharacterSystem.applyTo(player, charId || 'default');
}

const players = [
    createPlayer(WIDTH / 3, FLOOR - PLAYER_SIZE, 1, "Player 1", "vergil", 0),
  createPlayer(2 * WIDTH / 3, FLOOR - PLAYER_SIZE, -1, "Player 2", "vergil", 1),
];

function changeCharacter(playerId, characterId) {
  const player = players[playerId];
  const oldX = player.x;
  const oldY = player.y;
  const oldFacing = player.facing;
  const oldName = "Player " + (playerId + 1);
  
  // Create a new player with the selected character
  players[playerId] = createPlayer(oldX, oldY, oldFacing, oldName, characterId, playerId);
  log(`Player ${playerId + 1} switched to ${CharacterSystem.get(characterId).name}`);
}

document.addEventListener("keydown", function(e) {
    if (e.key === "5") changeCharacter(0, "vergil");  // For player 1
if (e.key === "6") changeCharacter(1, "vergil");
});

// Set up keyboard handling
const keyHandlers = {};
document.addEventListener("keydown", function(e) {
  const key = e.key.toLowerCase();
  if (!keyHandlers[key]) keyHandlers[key] = { isDown: false, downTime: 0, upTime: 0, pressCount: 0, lastPressTime: 0 };
  let h = keyHandlers[key];
  if (!h.isDown) {
    h.isDown = true;
    h.downTime = performance.now();
    if (performance.now() - h.lastPressTime < 300) {
      h.pressCount++;
    } else {
      h.pressCount = 1;
    }
    h.lastPressTime = performance.now();

    players.forEach(player => player.keyPress && player.keyPress(key, h.pressCount));
  }
});

document.addEventListener("keyup", function(e) {
  const key = e.key.toLowerCase();
  if (!keyHandlers[key]) keyHandlers[key] = { isDown: false, downTime: 0, upTime: 0, pressCount: 0, lastPressTime: 0 };
  let h = keyHandlers[key];
  if (h.isDown) {
    h.upTime = performance.now();
    let duration = h.upTime - h.downTime;
    h.isDown = false;
    players.forEach(player => player.keyRelease && player.keyRelease(key, duration));
  }
});

const keys = {};
document.addEventListener("keydown", e => { keys[e.key.toLowerCase()] = true; });
document.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });

function handleKeyEvents() {
  for (const key in keyHandlers) {
    const h = keyHandlers[key];
    if (h.isDown) {
      let holdDuration = performance.now() - h.downTime;
      players.forEach(player => player.keyHold && player.keyHold(key, holdDuration));
    }
    if (h.pressCount >= 2 && (performance.now() - h.lastPressTime < 300)) {
      players.forEach(player => player.keyPresses && player.keyPresses(key, h.pressCount));
      h.pressCount = 0;
    }
  }
}

function updateBlocking(p, pid) {
  const controls = getControls(pid);
  if (p._wasBlocking === undefined) p._wasBlocking = false;
  if (p.onGround && keys[controls.down]) {
    if (!p._wasBlocking && p.block < BLOCK_MAX) {
      p.blocking = false;
    } else if (p.block > 0) {
      p.blocking = true;
      reduceBlock(p, BLOCK_DEPLETION);
    } else {
      p.blocking = false;
    }
  } else {
    p.blocking = false;
  }
  if (!p.blocking && p.block < BLOCK_MAX) {
    addBlock(p, BLOCK_RECOVERY);
  }
  p._wasBlocking = p.blocking;
  if (p.dizzy > 0) {
    p.dizzy--;
    p.vx *= FRICTION;
    if (Math.abs(p.vx) < 0.3) p.vx = 0;
    return true;
  }
  return false;
}

// In game.js - modify updatePlayer function
function updatePlayer(p, pid) {
  if (!p.alive) return;

  // Update character-specific logic
  if (p.characterUpdate) {
    p.characterUpdate.call(p);
  }
  
  // Update animations
  if (p.updateAnimation) {
    p.updateAnimation();
  }
  if (p.isParalyzed) {
    p.vx *= 0.92;
    p.vy += GRAVITY;
    p.paralyzeTimer--;
    if (p.paralyzeTimer <= 0) {
      p.isParalyzed = false;
      p.paralyzeTimer = 0;
      p.movement = true;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.onGround = false;
    if (p.y + p.h >= FLOOR) {
      setPosition(p, p.x, FLOOR - p.h);
      p.vy = 0;
      p.onGround = true;
      p.jumps = 0;
    } else {
      for (let plat of platforms) {
        if (
          p.vy >= 0 &&
          p.x + p.w > plat.x && p.x < plat.x + plat.w &&
          p.y + p.h > plat.y && p.y + p.h - p.vy <= plat.y + 3
        ) {
          setPosition(p, p.x, plat.y - p.h);
          p.vy = 0;
          p.onGround = true;
          p.jumps = 0;
        }
      }
    }
    if (p.y < 0) { setPosition(p, p.x, 0); p.vy = 0; }
    return;
  }

  const controls = getControls(pid);
  if (updateBlocking(p, pid)) return;
  if (p.movement) {
    if (p.dash > 0) {
      p.dash--;
    } else {
      if (keys[controls.left] && !keys[controls.right] && !p.blocking) {
        p.vx = -PLAYER_SPEED; p.facing = -1;
      }
      if (keys[controls.right] && !keys[controls.left] && !p.blocking) {
        p.vx = PLAYER_SPEED; p.facing = 1;
      }
      if ((!keys[controls.left] && !keys[controls.right]) || p.blocking) {
        p.vx *= FRICTION;
        if (Math.abs(p.vx) < 0.3) p.vx = 0;
      }
    }
    let slowFallActive = false;
    if (!p.onGround && keys[controls.up]) slowFallActive = true;
    if (keys[controls.up]) {
      if ((p.onGround || p.jumps < MAX_JUMPS) && !p.jumpHeld && !p.blocking) {
        p.vy = -JUMP_VEL;
        p.jumps++;
        p.jumpHeld = true;
      }
    } else {
      p.jumpHeld = false;
    }
    if (p.dashCooldown > 0) p.dashCooldown--;
    if (slowFallActive && p.vy > 0) p.vy += GRAVITY * SLOW_FALL_MULTIPLIER;
    else p.vy += GRAVITY;
    p.x += p.vx; p.y += p.vy;
    p.x = Math.max(0, Math.min(WIDTH - p.w, p.x));
    p.onGround = false;
    if (p.y + p.h >= FLOOR) {
      setPosition(p, p.x, FLOOR - p.h);
      p.vy = 0;
      p.onGround = true;
      p.jumps = 0;
    } else {
      for (let plat of platforms) {
        if (
          p.vy >= 0 &&
          p.x + p.w > plat.x && p.x < plat.x + plat.w &&
          p.y + p.h > plat.y && p.y + p.h - p.vy <= plat.y + 3
        ) {
          setPosition(p, p.x, plat.y - p.h);
          p.vy = 0;
          p.onGround = true;
          p.jumps = 0;
        }
      }
    }
    if (p.y < 0) { setPosition(p, p.x, 0); p.vy = 0; }
  }
}

// In game.js - modify handleDashAndBlockDamage function
function handleDashAndBlockDamage() {
  let p1 = players[0], p2 = players[1];
  if (!p1.alive || !p2.alive) return;
  for (let i = 0; i < 2; i++) {
    let p = players[i], opp = players[1 - i];
    if (p.dash > 0 && !p.hasDashHit) {
      if (
        p.x < opp.x + opp.w && p.x + p.w > opp.x &&
        p.y < opp.y + opp.h && p.y + p.h > opp.y
      ) {
        if (isBlockingProperly(opp, p)) {
          // Block successful: push attacker back, deplete block, then paralyze attacker
          knockback(opp, p, BLOCK_PUSHBACK_X, BLOCK_PUSHBACK_Y);
          reduceBlock(opp, 12);
          setParalyzed(p, 45);
          
          // Award point for successful block
          points(opp, 1);
          log(opp.name + " gained 1 point for perfect block! (Total: " + opp.points + ")");
        } else {
          // Not blocking or wrong direction: take damage
          handleDashDmg(p, opp, 10);
        }
        p.hasDashHit = true;
      }
    }
    if (p.dash === 0) p.hasDashHit = false;
  }
}

// CAMERA MOVEMENT
function getCamera() {
    const p1 = players[0], p2 = players[1];
    const x1 = p1.x + p1.w / 2, y1 = p1.y + p1.h / 2;
    const x2 = p2.x + p2.w / 2, y2 = p2.y + p2.h / 2;

    // Center between both players
    let cx = (x1 + x2) / 2;
    let cy = (y1 + y2) / 2;

    // Add padding around players
    const extra = 80;
    const playersW = Math.abs(x2 - x1) + p1.w + p2.w + extra;
    const playersH = Math.abs(y2 - y1) + p1.h + p2.h + extra;

    // Zoom so both players fit
    const zoomW = canvas.width / playersW;
    const zoomH = canvas.height / playersH;
    let baseZoom = Math.min(zoomW, zoomH);

    // Clamp base zoom
    const minZoom = Math.max(canvas.width / WIDTH, canvas.height / HEIGHT);
    const maxZoom = 1.8;
    baseZoom = Math.max(minZoom, Math.min(maxZoom, baseZoom));
    
    // Apply zoom effect if active
    let finalZoom = baseZoom;
    if (cameraZoomEffect.active) {
        finalZoom = baseZoom * cameraZoomEffect.currentZoom;
    }

    // Keep camera within stage bounds
    const viewW = canvas.width / finalZoom, viewH = canvas.height / finalZoom;
    cx = Math.max(viewW / 2, Math.min(WIDTH - viewW / 2, cx));
    cy = Math.max(viewH / 2, Math.min(HEIGHT - viewH / 2, cy));

    return { cx, cy, zoom: finalZoom };
}

function startCameraZoomEffect() {
    cameraZoomEffect.active = true;
    cameraZoomEffect.phase = 'zoom_in';
    cameraZoomEffect.startTime = performance.now();
    cameraZoomEffect.startZoom = 1;
    cameraZoomEffect.currentZoom = 1;
}

function updateCameraZoomEffect() {
    if (!cameraZoomEffect.active) return;
    
    const now = performance.now();
    const elapsed = now - cameraZoomEffect.startTime;
    
    switch (cameraZoomEffect.phase) {
        case 'zoom_in':
            // Slowly zoom in with easing
            const zoomProgress = Math.min(elapsed / cameraZoomEffect.duration.zoomIn, 1);
            const easeProgress = 1 - Math.pow(1 - zoomProgress, 3); // Ease out cubic
            cameraZoomEffect.currentZoom = 1 + (cameraZoomEffect.targetZoom - 1) * easeProgress;
            
            if (elapsed >= cameraZoomEffect.duration.zoomIn) {
                cameraZoomEffect.phase = 'hold';
                cameraZoomEffect.startTime = now;
            }
            break;
            
        case 'hold':
            // Hold the zoom at target level
            cameraZoomEffect.currentZoom = cameraZoomEffect.targetZoom;
            
            if (elapsed >= cameraZoomEffect.duration.hold) {
                cameraZoomEffect.phase = 'zoom_out';
                cameraZoomEffect.startTime = now;
            }
            break;
            
        case 'zoom_out':
            // Zoom back out smoothly
            const outProgress = Math.min(elapsed / cameraZoomEffect.duration.zoomOut, 1);
            const easeOutProgress = Math.pow(outProgress, 2); // Ease in quadratic
            cameraZoomEffect.currentZoom = cameraZoomEffect.targetZoom - (cameraZoomEffect.targetZoom - 1) * easeOutProgress;
            
            if (elapsed >= cameraZoomEffect.duration.zoomOut) {
                // Effect complete
                cameraZoomEffect.active = false;
                cameraZoomEffect.phase = 'idle';
                cameraZoomEffect.currentZoom = 1;
            }
            break;
    }
}

function draw() {
  // Clear before transformations
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  const { cx, cy, zoom } = getCamera();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);

  // BACKGROUND
  ctx.fillStyle = "#181c24";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);

  // PLATFORMS
  platforms.forEach(p => {
    ctx.fillStyle = "#ffd54f";
    ctx.fillRect(p.x, p.y, p.w, PLATFORM_HEIGHT);
    ctx.strokeStyle = "#ffb300";
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x, p.y, p.w, PLATFORM_HEIGHT);
  });

  // PLAYERS
  for (let p of players) {
    if (!p.alive) continue;
    
    // Draw shadow
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h - 4, p.w / 2.5, 7, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Draw block indicator if blocking
    if (p.blocking && p.block > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#b0bec5";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.roundRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8, 18);
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw paralyzed indicator
    if (p.isParalyzed) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(performance.now() / 120);
      ctx.strokeStyle = "#ffd740";
      ctx.lineWidth = 4 + 2 * Math.sin(performance.now() / 60);
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y - 14, 19 + 3 * Math.sin(performance.now() / 120), 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw player body
    if (p.render) {
      // Use custom render method if defined by character
      p.render(ctx);
    } else {
      // Default player rendering
      ctx.fillStyle = p.color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
    
    // Draw hit flash
    if (p.justHit > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#fff";
      ctx.fillRect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);
      ctx.restore();
    }
  }

  // Add this after drawing players (around line 472)
  // Add visual feedback for pause state
  if (gameState.paused && gameState.pauseReason === 'judgement_cut') {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#4a90e2"; // Vergil's blue color
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // Add some dramatic text
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = "#4a90e2";
    ctx.shadowBlur = 10;
    
    ctx.font = "18px Arial";
    ctx.shadowBlur = 5;
    ctx.restore();
  }
  
  for (let p of players) {
    if (p.judgementCutEffect && p.judgementCutEffect.phase === 'lines') {
      const effect = p.judgementCutEffect;
      
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#3EB7FA";
      ctx.shadowBlur = 10;
 
    for (let i = 0; i < Math.min(effect.visibleLines, effect.lines.length); i++) {
        const line = effect.lines[i];
        const [x1, y1, x2, y2] = line;
        const worldX1 = effect.cameraX + x1;
        const worldY1 = effect.cameraY + y1;
        const worldX2 = effect.cameraX + x2;
        const worldY2 = effect.cameraY + y2;
        
        ctx.beginPath();
        ctx.moveTo(worldX1, worldY1);
        ctx.lineTo(worldX2, worldY2);
        ctx.stroke();
    }
      
      ctx.restore();
    }
  }
  
  for (let p of players) {
    if (p.judgementCutEffect && p.effectCtx) {
      const effect = p.judgementCutEffect;
      const effectCtx = p.effectCtx;
      effectCtx.clearRect(0, 0, effect.viewWidth, effect.viewHeight);
      for (let s of effect.shards) {
        effectCtx.save();
        let cx=0, cy=0;
        for (let pt of s.poly) { cx+=pt[0]; cy+=pt[1]; }
        cx/=s.poly.length; cy/=s.poly.length;     
        effectCtx.translate(cx + s.x, cy + s.y);
        effectCtx.rotate(s.angle);
        effectCtx.translate(-cx, -cy);
        effectCtx.beginPath();
        effectCtx.moveTo(s.poly[0][0], s.poly[0][1]);
        for (let j=1; j<s.poly.length; ++j) {
          effectCtx.lineTo(s.poly[j][0], s.poly[j][1]);
        }
        effectCtx.closePath();
        effectCtx.clip();
        effectCtx.drawImage(p.snapCanvas, 0, 0);
        effectCtx.fillStyle = "rgba(0, 127, 255, 0.1)";
        effectCtx.fill();
        effectCtx.strokeStyle = "#00bfff";
        effectCtx.lineWidth = 1;
        effectCtx.globalAlpha = 0.4;
        effectCtx.stroke();
        effectCtx.restore();
      }
      ctx.globalAlpha = 0.9;
      ctx.drawImage(p.effectCanvas, effect.cameraX, effect.cameraY);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore(); 
}

function updateUI() {
  let p1 = players[0], p2 = players[1];
  document.getElementById("p1hp").style.width = Math.max(0, p1.hp) + "%";
  document.getElementById("p2hp").style.width = Math.max(0, p2.hp) + "%";
  document.getElementById("p1block").style.width = (p1.block / BLOCK_MAX * 100) + "%";
  document.getElementById("p2block").style.width = (p2.block / BLOCK_MAX * 100) + "%";
  document.getElementById("p1dash").style.width = (1 - (p1.dashCooldown / DASH_COOLDOWN)) * 100 + "%";
  document.getElementById("p2dash").style.width = (1 - (p2.dashCooldown / DASH_COOLDOWN)) * 100 + "%";
  document.getElementById("p1name").textContent = p1.name;
  document.getElementById("p2name").textContent = p2.name;
  const p1PointsContainer = document.getElementById("p1points").children;
  const p2PointsContainer = document.getElementById("p2points").children;
  
  for (let i = 0; i < MAX_POINTS; i++) {
    p1PointsContainer[i].className = i < p1.points ? "point-circle active" : "point-circle";
    p2PointsContainer[i].className = i < p2.points ? "point-circle active" : "point-circle";
  }
}
function gameLoop() {
  handleKeyEvents();
  updateCameraZoomEffect();
  if (!gameState.paused) {
    for (let i = 0; i < players.length; i++) {
      let p = players[i];
      if (p.justHit > 0) p.justHit--;
      updatePlayer(p, i);
    }
    handleDashAndBlockDamage();
  }
  updateUI();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();