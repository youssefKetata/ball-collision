/**
 * Ball Physics Simulation
 *
 * A realistic physics simulation featuring bouncing balls with gravity,
 * friction, and collision detection. This class handles all the physics
 * calculations and animation for multiple balls in a container, now with
 * the ability to drag and throw balls using mouse or touch input.
 *
 * CONFIGURATION GUIDE:
 * ===================
 *
 * Physics Parameters (modify these in the constructor):
 * - ballSize:   Controls the diameter of all balls (e.g., 70)
 * - gravity:    Controls how fast balls fall (0.4 = normal, 0.2 = moon-like, 1.0 = heavy)
 * - friction:   Air resistance (0.98 = slight drag, 0.95 = more drag, 0.99 = less drag)
 * - bounceDamping: Energy loss on bounce (0.95 = bouncy, 0.8 = realistic, 0.6 = dead bounce)
 * - groundFriction: Friction with the floor (0.99 = slippery, 0.9 = realistic, 0.7 = high friction)
 *
 * IMPORTANT: When changing the ball size, the JavaScript automatically updates
 * the DOM element dimensions to match. You don't need to modify CSS separately.
 */

class BallPhysics {
  constructor() {
    // DOM reference to the container element
    this.container = document.getElementById('container');
    this.balls = [];

    // PHYSICS PARAMETERS - MODIFY THESE TO CHANGE BEHAVIOR
    this.ballSize = 70;
    this.gravity = 0.4;
    this.friction = 0.98;
    this.groundFriction = 0.99;
    this.bounceDamping = 0.95;
    this.maxThrowVelocity = 15; // Reduced from 800 to a reasonable value
    this.velocityMultiplier = 0.3; // Scale factor for throw velocity

    this.running = false;
    this.colors = [
      '#ff6b6b',
      '#4ecdc4',
      '#45b7d1',
      '#96ceb4',
      '#ffeaa7',
      '#fd79a8',
    ];

    this.svgs = [
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="#fff"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 12l-4-4v3H3v2h15v3l4-4z" fill="#fff"/></svg>',
    ];

    // Add document-level event listeners for dragging
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), {
      passive: false,
    });
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    this.init();
  }

  init() {
    this.setupBalls();
    this.startAnimation();
  }

  setupBalls() {
    const ballElements = document.querySelectorAll('.ball');
    const containerRect = this.container.getBoundingClientRect();

    ballElements.forEach((element, index) => {
      const size = this.ballSize;
      const radius = size / 2;
      element.style.width = size + 'px';
      element.style.height = size + 'px';
      element.innerHTML = this.svgs[index % this.svgs.length];

      const ball = {
        element: element,
        x: Math.random() * (containerRect.width - size) + radius,
        y: -70,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        radius: radius,
        size: size,
        color: this.colors[index % this.colors.length],
        mass: Math.PI * radius * radius * 0.1,
        // Improved dragging properties
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        dragStartTime: 0,
        dragPositions: [], // Store recent positions for better velocity calculation
        maxPositionHistory: 5, // Keep last 5 positions
      };

      gsap.set(element, {
        x: ball.x - radius,
        y: ball.y - radius,
        backgroundColor: ball.color,
      });

      this.balls.push(ball);

      // Add drag event listeners to each ball
      element.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.startDrag(ball, e);
      });
      element.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          if (e.touches.length === 1) {
            this.startDrag(ball, e.touches[0]);
          }
        },
        { passive: false }
      );
    });
  }

  startAnimation() {
    if (this.running) return;
    this.running = true;
    this.animate();
  }

  animate() {
    if (!this.running) return;
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    this.balls.forEach((ball) => {
      if (!ball.isDragging) {
        // Apply physics only to non-dragged balls
        ball.vy += this.gravity;
        ball.vx *= this.friction;
        ball.vy *= this.friction;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Apply velocity damping when balls are moving very slowly (reduces shaking)
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed < 0.1) {
          ball.vx *= 0.9;
          ball.vy *= 0.9;
        }

        // Wall collision detection with proper bounds checking
        if (ball.x - ball.radius <= 0) {
          ball.x = ball.radius;
          ball.vx = -ball.vx * this.bounceDamping;
        } else if (ball.x + ball.radius >= containerWidth) {
          ball.x = containerWidth - ball.radius;
          ball.vx = -ball.vx * this.bounceDamping;
        }
        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.vy = -ball.vy * this.bounceDamping;
        } else if (ball.y + ball.radius >= containerHeight) {
          ball.y = containerHeight - ball.radius;
          ball.vy = -ball.vy * this.bounceDamping;
          ball.vx *= this.groundFriction;
        }

        // Additional bounds safety check (prevents balls from going outside on resize)
        ball.x = Math.max(
          ball.radius,
          Math.min(containerWidth - ball.radius, ball.x)
        );
        ball.y = Math.max(
          ball.radius,
          Math.min(containerHeight - ball.radius, ball.y)
        );
      }

      // Update DOM position for all balls
      gsap.set(ball.element, {
        x: ball.x - ball.radius,
        y: ball.y - ball.radius,
      });
    });

    this.checkBallCollisions();
    requestAnimationFrame(() => this.animate());
  }

  checkBallCollisions() {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const ball1 = this.balls[i];
        const ball2 = this.balls[j];
        // Skip collision checks if either ball is being dragged
        if (ball1.isDragging || ball2.isDragging) continue;

        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = ball1.radius + ball2.radius;

        if (distance < minDistance) {
          this.handleBallCollision(ball1, ball2, dx, dy, distance, minDistance);
        }
      }
    }
  }

  handleBallCollision(ball1, ball2, dx, dy, distance, minDistance) {
    const overlap = minDistance - distance;
    const normalX = dx / distance;
    const normalY = dy / distance;

    // Separate balls with improved overlap resolution
    const totalMass = ball1.mass + ball2.mass;
    const separationX = overlap * (ball2.mass / totalMass) * normalX;
    const separationY = overlap * (ball2.mass / totalMass) * normalY;

    ball1.x -= separationX;
    ball1.y -= separationY;
    ball2.x += overlap * (ball1.mass / totalMass) * normalX;
    ball2.y += overlap * (ball1.mass / totalMass) * normalY;

    // Calculate relative velocity
    const rvx = ball2.vx - ball1.vx;
    const rvy = ball2.vy - ball1.vy;
    const velAlongNormal = rvx * normalX + rvy * normalY;

    // Don't resolve if velocities are separating
    if (velAlongNormal > 0) return;

    // Add minimum separation to prevent micro-oscillations
    const minSeparation = 0.1;
    if (Math.abs(velAlongNormal) < minSeparation) {
      // Apply small separation force to prevent sticking
      ball1.vx -= normalX * minSeparation;
      ball1.vy -= normalY * minSeparation;
      ball2.vx += normalX * minSeparation;
      ball2.vy += normalY * minSeparation;
      return;
    }

    const e = this.bounceDamping;
    const j = (-(1 + e) * velAlongNormal) / (1 / ball1.mass + 1 / ball2.mass);
    const impulseX = j * normalX;
    const impulseY = j * normalY;

    ball1.vx -= impulseX / ball1.mass;
    ball1.vy -= impulseY / ball1.mass;
    ball2.vx += impulseX / ball2.mass;
    ball2.vy += impulseY / ball2.mass;

    // Apply additional damping to reduce oscillations
    const dampingFactor = 0.98;
    ball1.vx *= dampingFactor;
    ball1.vy *= dampingFactor;
    ball2.vx *= dampingFactor;
    ball2.vy *= dampingFactor;

    this.createCollisionEffect(ball1, ball2);
  }

  createCollisionEffect(ball1, ball2) {
    // Optional: Add visual feedback for collisions
  }

  resetSoft() {
    this.stop();
    this.balls = [];
    setTimeout(() => {
      this.setupBalls();
      this.startAnimation();
    }, 100);
  }

  resetHard(numBalls = 4) {
    this.stop();
    this.balls = [];
    this.container.innerHTML = '';
    for (let i = 0; i < numBalls; i++) {
      const newBallElement = document.createElement('div');
      newBallElement.className = 'ball';
      this.container.appendChild(newBallElement);
    }
    setTimeout(() => {
      this.setupBalls();
      this.startAnimation();
    }, 50);
  }

  // NEW: Smart resize handling method
  handleResize() {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    // Reset velocities to prevent supersonic speeds
    this.balls.forEach((ball) => {
      ball.vx = 0;
      ball.vy = 0;

      // Ensure balls are within new container bounds
      ball.x = Math.max(
        ball.radius,
        Math.min(containerWidth - ball.radius, ball.x)
      );
      ball.y = Math.max(
        ball.radius,
        Math.min(containerHeight - ball.radius, ball.y)
      );

      // If ball is outside vertically, move it to a safe position
      if (ball.y > containerHeight - ball.radius) {
        ball.y = containerHeight - ball.radius;
      }
      if (ball.x > containerWidth - ball.radius) {
        ball.x = containerWidth - ball.radius;
      }
    });

    // Separate any overlapping balls after resize
    this.separateOverlappingBalls();
  }

  // NEW: Method to separate overlapping balls after resize
  separateOverlappingBalls() {
    const maxIterations = 10;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasOverlap = false;

      for (let i = 0; i < this.balls.length; i++) {
        for (let j = i + 1; j < this.balls.length; j++) {
          const ball1 = this.balls[i];
          const ball2 = this.balls[j];

          const dx = ball2.x - ball1.x;
          const dy = ball2.y - ball1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = ball1.radius + ball2.radius;

          if (distance < minDistance && distance > 0) {
            hasOverlap = true;

            // Calculate separation
            const overlap = minDistance - distance;
            const normalX = dx / distance;
            const normalY = dy / distance;

            // Move balls apart
            const moveDistance = overlap * 0.5;
            ball1.x -= normalX * moveDistance;
            ball1.y -= normalY * moveDistance;
            ball2.x += normalX * moveDistance;
            ball2.y += normalY * moveDistance;

            // Ensure balls stay within bounds
            const containerWidth = this.container.clientWidth;
            const containerHeight = this.container.clientHeight;

            ball1.x = Math.max(
              ball1.radius,
              Math.min(containerWidth - ball1.radius, ball1.x)
            );
            ball1.y = Math.max(
              ball1.radius,
              Math.min(containerHeight - ball1.radius, ball1.y)
            );
            ball2.x = Math.max(
              ball2.radius,
              Math.min(containerWidth - ball2.radius, ball2.x)
            );
            ball2.y = Math.max(
              ball2.radius,
              Math.min(containerHeight - ball2.radius, ball2.y)
            );
          }
        }
      }

      // If no overlaps found, we're done
      if (!hasOverlap) break;
    }
  }

  addRandomBall() {
    if (this.balls.length >= 40) return;

    const container = this.container;
    const newBall = document.createElement('div');
    const size = this.ballSize;
    const radius = size / 2;

    newBall.className = 'ball';
    newBall.style.width = size + 'px';
    newBall.style.height = size + 'px';
    newBall.style.borderRadius = '50%';
    newBall.innerHTML = this.svgs[Math.floor(Math.random() * this.svgs.length)];
    container.appendChild(newBall);

    const containerRect = container.getBoundingClientRect();
    const ball = {
      element: newBall,
      x: Math.random() * (containerRect.width - size) + radius,
      y: radius + 10,
      vx: (Math.random() - 0.5) * 10,
      vy: Math.random() * 3,
      radius: radius,
      size: size,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      mass: Math.PI * radius * radius * 0.1,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      dragStartTime: 0,
      dragPositions: [],
      maxPositionHistory: 5,
    };

    gsap.set(newBall, {
      x: ball.x - radius,
      y: ball.y - radius,
      backgroundColor: ball.color,
      scale: 0,
    });

    gsap.to(newBall, {
      scale: 1,
      duration: 0.3,
      ease: 'back.out(1.7)',
    });

    this.balls.push(ball);

    // Add drag event listeners to new ball
    newBall.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startDrag(ball, e);
    });
    newBall.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          this.startDrag(ball, e.touches[0]);
        }
      },
      { passive: false }
    );
  }

  stop() {
    this.running = false;
  }

  // Improved Dragging Methods
  getMousePos(event) {
    const rect = this.container.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  startDrag(ball, event) {
    const mousePos = this.getMousePos(event);
    ball.isDragging = true;
    ball.dragOffsetX = ball.x - mousePos.x;
    ball.dragOffsetY = ball.y - mousePos.y;
    ball.dragStartTime = Date.now();

    // Clear position history and start fresh
    ball.dragPositions = [];
    ball.dragPositions.push({
      x: ball.x,
      y: ball.y,
      time: ball.dragStartTime,
    });
  }

  updateDragPosition(ball, mousePos) {
    if (!ball.isDragging) return;

    const currentTime = Date.now();
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    // Calculate desired position
    let newX = mousePos.x + ball.dragOffsetX;
    let newY = mousePos.y + ball.dragOffsetY;

    // Constrain ball within container bounds
    newX = Math.max(ball.radius, Math.min(containerWidth - ball.radius, newX));
    newY = Math.max(ball.radius, Math.min(containerHeight - ball.radius, newY));

    // Check for collisions with other balls and resolve them
    const resolvedPosition = this.resolveDragCollisions(ball, newX, newY);

    ball.x = resolvedPosition.x;
    ball.y = resolvedPosition.y;

    // Store position history for velocity calculation
    ball.dragPositions.push({
      x: ball.x,
      y: ball.y,
      time: currentTime,
    });

    // Keep only recent positions
    if (ball.dragPositions.length > ball.maxPositionHistory) {
      ball.dragPositions.shift();
    }
  }

  resolveDragCollisions(draggedBall, desiredX, desiredY) {
    let resolvedX = desiredX;
    let resolvedY = desiredY;

    // Check collision with all other balls
    for (let otherBall of this.balls) {
      if (otherBall === draggedBall) continue;

      const dx = resolvedX - otherBall.x;
      const dy = resolvedY - otherBall.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = draggedBall.radius + otherBall.radius;

      if (distance < minDistance && distance > 0) {
        // Calculate collision normal
        const normalX = dx / distance;
        const normalY = dy / distance;

        // Push the dragged ball away from the collision
        const overlap = minDistance - distance;
        resolvedX += normalX * overlap;
        resolvedY += normalY * overlap;

        // If the other ball is not being dragged, push it away too
        if (!otherBall.isDragging) {
          // Apply a gentle push to the other ball
          const pushStrength = 0.5;
          otherBall.vx += normalX * pushStrength;
          otherBall.vy += normalY * pushStrength;

          // Also slightly move the other ball to prevent overlap
          otherBall.x -= normalX * (overlap * 0.3);
          otherBall.y -= normalY * (overlap * 0.3);

          // Ensure the pushed ball stays within bounds
          const containerWidth = this.container.clientWidth;
          const containerHeight = this.container.clientHeight;
          otherBall.x = Math.max(
            otherBall.radius,
            Math.min(containerWidth - otherBall.radius, otherBall.x)
          );
          otherBall.y = Math.max(
            otherBall.radius,
            Math.min(containerHeight - otherBall.radius, otherBall.y)
          );
        }
      }
    }

    // Make sure the resolved position is still within container bounds
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    resolvedX = Math.max(
      draggedBall.radius,
      Math.min(containerWidth - draggedBall.radius, resolvedX)
    );
    resolvedY = Math.max(
      draggedBall.radius,
      Math.min(containerHeight - draggedBall.radius, resolvedY)
    );

    return { x: resolvedX, y: resolvedY };
  }

  calculateThrowVelocity(ball) {
    if (ball.dragPositions.length < 2) {
      return { vx: 0, vy: 0 };
    }

    // Use the last few positions to calculate average velocity
    const recent = ball.dragPositions.slice(-3); // Last 3 positions
    const first = recent[0];
    const last = recent[recent.length - 1];

    const timeDiff = (last.time - first.time) / 1000; // Convert to seconds

    if (timeDiff <= 0) {
      return { vx: 0, vy: 0 };
    }

    const deltaX = last.x - first.x;
    const deltaY = last.y - first.y;

    // Calculate velocity and apply scaling
    let vx = (deltaX / timeDiff) * this.velocityMultiplier;
    let vy = (deltaY / timeDiff) * this.velocityMultiplier;

    // Limit maximum velocity
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > this.maxThrowVelocity) {
      const scaleFactor = this.maxThrowVelocity / speed;
      vx *= scaleFactor;
      vy *= scaleFactor;
    }

    return { vx, vy };
  }

  handleMouseMove(e) {
    const mousePos = this.getMousePos(e);
    this.balls.forEach((ball) => {
      if (ball.isDragging) {
        this.updateDragPosition(ball, mousePos);
      }
    });
  }

  handleMouseUp(e) {
    this.balls.forEach((ball) => {
      if (ball.isDragging) {
        ball.isDragging = false;

        // Calculate and apply throw velocity
        const velocity = this.calculateThrowVelocity(ball);
        ball.vx = velocity.vx;
        ball.vy = velocity.vy;

        // Clear position history
        ball.dragPositions = [];
      }
    });
  }

  handleTouchMove(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mousePos = this.getMousePos(touch);
      this.balls.forEach((ball) => {
        if (ball.isDragging) {
          this.updateDragPosition(ball, mousePos);
        }
      });
    }
  }

  handleTouchEnd(e) {
    this.balls.forEach((ball) => {
      if (ball.isDragging) {
        ball.isDragging = false;

        // Calculate and apply throw velocity
        const velocity = this.calculateThrowVelocity(ball);
        ball.vx = velocity.vx;
        ball.vy = velocity.vy;

        // Clear position history
        ball.dragPositions = [];
      }
    });
  }
}

// GLOBAL VARIABLES
let ballPhysics;

/**
 * INITIALIZATION
 * Wait for DOM to be ready before creating physics simulation
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!ballPhysics) {
    ballPhysics = new BallPhysics();
  }
});

/**
 * CONTROL FUNCTIONS
 */

/**
 * Soft reset the simulation.
 * Re-randomizes the existing balls.
 */
function resetSoftAnimation() {
  if (ballPhysics) {
    ballPhysics.resetSoft();
  }
}

/**
 * Hard reset the simulation.
 * Creates a new set of balls.
 * @param {number} numBalls - The desired number of balls.
 */
function resetHardAnimation(numBalls) {
  if (ballPhysics) {
    ballPhysics.resetHard(numBalls);
  }
}

/**
 * Add a new random ball to the simulation
 * Ball will drop from the top with random properties
 */
function addRandomBall() {
  if (ballPhysics) {
    ballPhysics.addRandomBall();
  }
}

/**
 * EVENT HANDLERS
 */

/**
 * Handle window resize
 * Uses a debounce to call the smart resize handler, which adjusts the
 * simulation to new container dimensions without a full reset.
 */
let resizeTimeout;
window.addEventListener('resize', () => {
  if (ballPhysics) {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      ballPhysics.handleResize();
    }, 100);
  }
});

// Fallback initializer for cases where DOM is already loaded
if (document.readyState !== 'loading' && !ballPhysics) {
  ballPhysics = new BallPhysics();
}
