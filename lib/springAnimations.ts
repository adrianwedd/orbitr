// Spring Physics Animation Framework for ORBITR
// Natural, satisfying animations with proper spring mechanics

export interface SpringConfig {
  stiffness: number;    // Spring strength (higher = more aggressive)
  damping: number;      // Dampening force (higher = less bouncy)
  mass: number;         // Object mass (higher = slower response)
  precision: number;    // Stop threshold (smaller = more precise)
}

export interface AnimationTarget {
  value: number;
  velocity: number;
  target: number;
  config: SpringConfig;
}

export interface SpringPresets {
  gentle: SpringConfig;
  wobbly: SpringConfig;
  stiff: SpringConfig;
  slow: SpringConfig;
  molasses: SpringConfig;
  bouncy: SpringConfig;
  energetic: SpringConfig;
}

// Common spring presets
export const springPresets: SpringPresets = {
  gentle: { stiffness: 120, damping: 14, mass: 1, precision: 0.01 },
  wobbly: { stiffness: 180, damping: 12, mass: 1, precision: 0.01 },
  stiff: { stiffness: 210, damping: 20, mass: 1, precision: 0.01 },
  slow: { stiffness: 280, damping: 60, mass: 1, precision: 0.01 },
  molasses: { stiffness: 280, damping: 120, mass: 1, precision: 0.01 },
  bouncy: { stiffness: 400, damping: 8, mass: 1, precision: 0.01 },
  energetic: { stiffness: 300, damping: 10, mass: 1, precision: 0.01 }
};

export class SpringAnimation {
  private targets = new Map<string, AnimationTarget>();
  private callbacks = new Map<string, (value: number, velocity: number) => void>();
  private isRunning = false;
  private animationId: number | null = null;
  private lastTime = 0;
  
  // Performance tracking
  private frameCount = 0;
  private maxDeltaTime = 16.67; // Cap at 60fps equivalent

  constructor() {
    this.lastTime = performance.now();
  }

  // Add or update a spring animation
  animate(
    key: string,
    targetValue: number,
    config: SpringConfig = springPresets.gentle,
    callback?: (value: number, velocity: number) => void,
    initialValue?: number,
    initialVelocity?: number
  ): void {
    const existing = this.targets.get(key);
    
    this.targets.set(key, {
      value: initialValue ?? existing?.value ?? targetValue,
      velocity: initialVelocity ?? existing?.velocity ?? 0,
      target: targetValue,
      config
    });
    
    if (callback) {
      this.callbacks.set(key, callback);
    }
    
    if (!this.isRunning) {
      this.start();
    }
  }

  // Update the target value for an existing animation
  setTarget(key: string, targetValue: number): void {
    const target = this.targets.get(key);
    if (target) {
      target.target = targetValue;
      if (!this.isRunning) {
        this.start();
      }
    }
  }

  // Get current value and velocity
  getValue(key: string): { value: number; velocity: number } | null {
    const target = this.targets.get(key);
    return target ? { value: target.value, velocity: target.velocity } : null;
  }

  // Remove an animation
  remove(key: string): void {
    this.targets.delete(key);
    this.callbacks.delete(key);
    
    if (this.targets.size === 0) {
      this.stop();
    }
  }

  // Clear all animations
  clear(): void {
    this.targets.clear();
    this.callbacks.clear();
    this.stop();
  }

  private start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  private stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private tick = (currentTime: number = performance.now()): void => {
    if (!this.isRunning) return;
    
    const deltaTime = Math.min(currentTime - this.lastTime, this.maxDeltaTime);
    this.lastTime = currentTime;
    
    if (deltaTime > 0) {
      this.update(deltaTime / 1000); // Convert to seconds
    }
    
    // Continue animation if there are active targets
    if (this.targets.size > 0) {
      this.animationId = requestAnimationFrame(this.tick);
    } else {
      this.stop();
    }
  };

  private update(deltaTime: number): void {
    const completedAnimations: string[] = [];
    
    for (const [key, target] of Array.from(this.targets.entries())) {
      const wasCompleted = this.updateTarget(target, deltaTime);
      
      // Call callback with current value
      const callback = this.callbacks.get(key);
      if (callback) {
        callback(target.value, target.velocity);
      }
      
      // Mark for removal if completed and at rest
      if (wasCompleted) {
        completedAnimations.push(key);
      }
    }
    
    // Remove completed animations
    completedAnimations.forEach(key => {
      this.targets.delete(key);
      // Keep callback in case animation is restarted
    });
    
    this.frameCount++;
  }

  private updateTarget(target: AnimationTarget, deltaTime: number): boolean {
    const { stiffness, damping, mass, precision } = target.config;
    
    // Spring force calculation: F = -k * x - c * v
    const displacement = target.value - target.target;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * target.velocity;
    const force = springForce + dampingForce;
    
    // Acceleration: a = F / m
    const acceleration = force / mass;
    
    // Integrate velocity and position using improved Euler method
    const newVelocity = target.velocity + acceleration * deltaTime;
    const avgVelocity = (target.velocity + newVelocity) / 2;
    const newValue = target.value + avgVelocity * deltaTime;
    
    target.velocity = newVelocity;
    target.value = newValue;
    
    // Check if animation is effectively complete
    const isAtRest = Math.abs(displacement) < precision && Math.abs(target.velocity) < precision;
    
    if (isAtRest) {
      target.value = target.target;
      target.velocity = 0;
      return true;
    }
    
    return false;
  }

  // Utility methods for common UI patterns
  animateScale(
    element: HTMLElement,
    targetScale: number,
    config: SpringConfig = springPresets.bouncy
  ): void {
    const key = `scale-${element.id || Math.random()}`;
    this.animate(
      key,
      targetScale,
      config,
      (value) => {
        element.style.transform = `scale(${value})`;
      },
      1 // Initial scale
    );
  }

  animateOpacity(
    element: HTMLElement,
    targetOpacity: number,
    config: SpringConfig = springPresets.gentle
  ): void {
    const key = `opacity-${element.id || Math.random()}`;
    const currentOpacity = parseFloat(element.style.opacity || '1');
    
    this.animate(
      key,
      targetOpacity,
      config,
      (value) => {
        element.style.opacity = value.toString();
      },
      currentOpacity
    );
  }

  animatePosition(
    element: HTMLElement,
    targetX: number,
    targetY: number,
    config: SpringConfig = springPresets.stiff
  ): void {
    const keyX = `posX-${element.id || Math.random()}`;
    const keyY = `posY-${element.id || Math.random()}`;
    
    const currentTransform = element.style.transform;
    const currentX = this.extractTransformValue(currentTransform, 'translateX') || 0;
    const currentY = this.extractTransformValue(currentTransform, 'translateY') || 0;
    
    this.animate(keyX, targetX, config, undefined, currentX);
    this.animate(keyY, targetY, config, undefined, currentY);
    
    // Update transform on each frame
    const updateTransform = () => {
      const x = this.getValue(keyX)?.value || 0;
      const y = this.getValue(keyY)?.value || 0;
      element.style.transform = `translate(${x}px, ${y}px)`;
    };
    
    this.callbacks.set(keyX, updateTransform);
    this.callbacks.set(keyY, updateTransform);
  }

  private extractTransformValue(transform: string, property: string): number | null {
    const regex = new RegExp(`${property}\\(([^)]+)\\)`);
    const match = transform.match(regex);
    return match ? parseFloat(match[1]) : null;
  }

  // Advanced animation sequencing
  sequence(animations: Array<{
    delay?: number;
    duration?: number;
    key: string;
    target: number;
    config?: SpringConfig;
    callback?: (value: number, velocity: number) => void;
  }>): void {
    animations.forEach((anim, index) => {
      setTimeout(() => {
        this.animate(anim.key, anim.target, anim.config, anim.callback);
      }, anim.delay || index * 100);
    });
  }

  // Parallel animations with different timings
  stagger(
    keys: string[],
    targetValues: number[] | number,
    config: SpringConfig = springPresets.gentle,
    staggerDelay: number = 50,
    callback?: (key: string, value: number, velocity: number) => void
  ): void {
    keys.forEach((key, index) => {
      const target = Array.isArray(targetValues) ? targetValues[index] : targetValues;
      
      setTimeout(() => {
        this.animate(
          key,
          target,
          config,
          callback ? (value, velocity) => callback(key, value, velocity) : undefined
        );
      }, index * staggerDelay);
    });
  }

  // Audio-reactive spring animation
  audioReactive(
    key: string,
    baseValue: number,
    reactiveScale: number,
    audioLevel: number,
    config: SpringConfig = springPresets.energetic,
    callback?: (value: number, velocity: number) => void
  ): void {
    const target = baseValue + (audioLevel * reactiveScale);
    this.animate(key, target, config, callback);
  }

  // Get animation statistics
  getStats(): {
    activeAnimations: number;
    frameCount: number;
    isRunning: boolean;
  } {
    return {
      activeAnimations: this.targets.size,
      frameCount: this.frameCount,
      isRunning: this.isRunning
    };
  }
}

// Global spring animation instance for easy access
export const springAnimations = new SpringAnimation();

// React hook for spring animations (requires React import in consuming component)
export function useSpringValue(
  targetValue: number,
  config: SpringConfig = springPresets.gentle,
  key?: string
): { value: number; velocity: number; setValue: (target: number) => void } {
  // Note: This would require React import in the consuming component
  // For now, this is a placeholder - implement when needed in a React component
  throw new Error('useSpringValue requires React context - implement in a React component');
}

// Utility functions for creating smooth transitions
export function createSpringTransition(
  element: HTMLElement,
  property: string,
  targetValue: number,
  config: SpringConfig = springPresets.gentle,
  unit: string = ''
): void {
  const key = `${property}-${element.id || Math.random()}`;
  const currentValue = parseFloat(getComputedStyle(element).getPropertyValue(property)) || 0;
  
  springAnimations.animate(
    key,
    targetValue,
    config,
    (value) => {
      (element.style as any)[property] = `${value}${unit}`;
    },
    currentValue
  );
}

// CSS custom property animation
export function animateCSSProperty(
  element: HTMLElement,
  property: string,
  targetValue: number,
  config: SpringConfig = springPresets.gentle,
  unit: string = ''
): void {
  const key = `css-${property}-${element.id || Math.random()}`;
  const currentValue = parseFloat(
    getComputedStyle(element).getPropertyValue(property).replace(unit, '')
  ) || 0;
  
  springAnimations.animate(
    key,
    targetValue,
    config,
    (value) => {
      element.style.setProperty(property, `${value}${unit}`);
    },
    currentValue
  );
}

export default SpringAnimation;