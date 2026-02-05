import { StrictMode } from 'react';

import { DraggingShape } from './components/DraggingShape';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FullScreenButton as FullScreenFloatingActionButton } from './components/FullScreenButton';
import { GridEditorProvider } from './contexts/GridEditorContext';
import { Header } from './components/Header';
import { MusicControlProvider } from './contexts/MusicControlContext';
import { PersistenceListener } from './components/PersistenceListener';
import { SoundEffectsProvider } from './contexts/SoundEffectsContext';
import { Tetrix } from './components/Tetrix';
import { TetrixProvider } from './contexts/TetrixContext';
import { ThemeProvider } from './components/ThemeProvider';
import { ToastOverlay } from './components/ToastOverlay';
import { UpdateNotification } from './components/UpdateNotification';
import { usePointerTracking } from './hooks/usePointerTracking';
import { useShapePlacement } from './hooks/useShapePlacement';
import { useUpdateNotification } from './hooks/useUpdateNotification';

import './App.css';

const AppContent = (): JSX.Element => {
  // Custom hooks encapsulate all React hook logic
  const { showUpdateNotification, handleUpdate, handleDismissUpdate } = useUpdateNotification();
  usePointerTracking();
  useShapePlacement();

  return (
    <>
      <PersistenceListener />

      <Header />
      <div className="game-container">
        <Tetrix />
      </div>
      <FullScreenFloatingActionButton />
      <DraggingShape />
      <ToastOverlay />

      {showUpdateNotification && (
        <UpdateNotification
          onUpdate={handleUpdate}
          onDismiss={handleDismissUpdate}
        />
      )}
    </>
  );
};

const App = (): JSX.Element => {
  return (
    <StrictMode>
      <ErrorBoundary>
        <SoundEffectsProvider>
          <MusicControlProvider>
            <TetrixProvider>
              <GridEditorProvider>
                <ThemeProvider>
                  <AppContent />
                </ThemeProvider>
              </GridEditorProvider>
            </TetrixProvider>
          </MusicControlProvider>
        </SoundEffectsProvider>
      </ErrorBoundary>
    </StrictMode>
  );
};

export { App };

/**
 * A "shape" consists of a 4x4 grid of Blocks.
 * Each Block, of course, has a color, and a boolean value indicating whether it is filled or not.
 */
