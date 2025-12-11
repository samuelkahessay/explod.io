import { InputState } from '../types/GameTypes';

export class InputManager {
  private inputState: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    fire: false,
  };

  private firePressed: boolean = false;

  // Mouse movement tracking for bullet time
  private mouseDelta: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.inputState.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.inputState.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.inputState.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.inputState.right = true;
        break;
      case 'Space':
        this.inputState.jump = true;
        break;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.inputState.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.inputState.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.inputState.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.inputState.right = false;
        break;
      case 'Space':
        this.inputState.jump = false;
        break;
    }
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.firePressed = true;
      this.inputState.fire = true;
    }
  };

  private onMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.firePressed = false;
      this.inputState.fire = false;
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    this.mouseDelta.x += Math.abs(event.movementX);
    this.mouseDelta.y += Math.abs(event.movementY);
  };

  public getInputState(): InputState {
    const state = { ...this.inputState };
    // Reset fire after reading to prevent continuous firing
    // But keep it true if still pressed
    if (!this.firePressed) {
      this.inputState.fire = false;
    }
    return state;
  }

  public consumeFire(): boolean {
    if (this.inputState.fire) {
      this.inputState.fire = false;
      return true;
    }
    return false;
  }

  // Check if player is providing any input (for bullet time)
  public isPlayerActive(): boolean {
    const hasMovement =
      this.inputState.forward ||
      this.inputState.backward ||
      this.inputState.left ||
      this.inputState.right;
    const hasMouseMovement = this.mouseDelta.x > 0.5 || this.mouseDelta.y > 0.5;
    const hasFire = this.inputState.fire || this.firePressed;
    const hasJump = this.inputState.jump;

    // Reset mouse delta after checking
    this.mouseDelta = { x: 0, y: 0 };

    return hasMovement || hasMouseMovement || hasFire || hasJump;
  }

  public dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}
