import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStudioStore, DEFAULT_CAMERA } from '../camera/store';
import { Studio } from './Studio';

describe('camera studio', () => {
  afterEach(cleanup);
  beforeEach(() => {
    useStudioStore.setState({ camera: DEFAULT_CAMERA, source: 'scene2d', sceneId: 'tokyo', workspace: 'shoot', language: 'en' });
  });

  it('opens with a usable practice view and all four exposure modes', () => {
    render(<Studio />);
    expect(screen.getByRole('heading', { name: 'After the rain' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /A\s*APERTURE/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /CAPTURE.*SPACE BAR/i })).toBeEnabled();
  });

  it('requests camera access only after a deliberate camera-start action', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('permission denied'));
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    render(<Studio />);
    expect(getUserMedia).not.toHaveBeenCalled();
    const cameraSource = document.querySelector<HTMLButtonElement>('.source-button:last-child');
    expect(cameraSource).not.toBeNull();
    await userEvent.click(cameraSource!);
    expect(getUserMedia).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Start camera/i }));
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
  });

  it('switches brand-specific controls and applies subject-program starting settings', async () => {
    const user = userEvent.setup();
    render(<Studio />);
    const body = screen.getByRole('combobox', { name: 'Camera body' });
    expect(screen.getByRole('combobox', { name: 'Dual native ISO' })).toBeEnabled();

    await user.selectOptions(body, 'fujifilm-xt5');
    expect(useStudioStore.getState().camera.sensor).toBe('aps-c');
    expect(screen.getByRole('combobox', { name: 'Picture style' })).toHaveValue('fuji-provia');
    expect(screen.getByRole('combobox', { name: 'Dual native ISO' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Soft skin' })).toBeEnabled();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Subject program' }), 'portrait');
    expect(useStudioStore.getState().camera.aperture).toBe(2.8);
    expect(useStudioStore.getState().camera.softSkin).toBe('standard');
    expect(useStudioStore.getState().camera.toneSimulation).toBe('fuji-pro-neg-std');
  });
});
