/*
 * This screen represents both the start-up and in-game menu screen. It should present basic options: new game, load game, settings.
 */

import { FC, useEffect, useState } from "react";
import { Stage } from "../Stage";
import { ScreenType } from "./BaseScreen";
import { useTooltip } from "./TooltipContext";
import { FiberNew, PlayArrow, Settings } from "@mui/icons-material";
import { SettingsScreen } from "./SettingsScreen";
import { BlurredBackground } from "@lord-raven/novel-visualizer";
import { Button, GridOverlay, Title } from "./UIComponents";
import { motion } from "framer-motion";

interface MenuScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
}

export const MenuScreen: FC<MenuScreenProps> = ({ stage, setScreenType }) => {
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isNewGameSettings, setIsNewGameSettings] = useState(false);
    const [showContentManagement, setShowContentManagement] = useState(false);
    const { setTooltip, clearTooltip } = useTooltip();
    const disableAllButtons = false; // When true, disable all options on this menu, including escape to continue; this is being used to effectively shut down the game at the moment.
    
    // Check if a save exists (if there are any actors or the layout has been modified)
    const saveExists = () => {
        return stage().saveData && Object.keys(stage().saveData.actors).length > 0;
    };

    // Handle escape key to continue game if available
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !disableAllButtons) {
                if (showSettings) {
                    console.log('close settings');
                    handleSettingsCancel();
                } else if (showContentManagement) {
                    console.log('close content management');
                    setShowContentManagement(false);
                } else if (saveExists() && !showSettings) {
                    console.log('continue');
                    handleContinue();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSettings]);

    const handleContinue = () => {
        setScreenType(ScreenType.STUDIO);
    };

    const handleNewGame = () => {
        // Show settings screen for new game setup
        setIsNewGameSettings(true);
        setShowSettings(true);
    };

    const handleSettings = () => {
        // Show settings screen
        setIsNewGameSettings(false);
        setShowSettings(true);
    };

    const handleSettingsCancel = () => {
        setShowSettings(false);
        setIsNewGameSettings(false);
    };

    const handleSettingsConfirm = () => {
        setShowSettings(false);
        if (isNewGameSettings) {
            setIsNewGameSettings(false);
            setScreenType(ScreenType.LOADING);
        }
    };

    const menuButtons = [
        ...(saveExists() ? [{ 
            key: 'continue', 
            label: 'Continue', 
            onClick: handleContinue,
            enabled: !disableAllButtons,
            tooltip: disableAllButtons ? 'Currently unavailable' : 'Resume your current game',
            icon: PlayArrow
        }] : []),
        { 
            key: 'new', 
            label: 'New Game', 
            onClick: handleNewGame,
            enabled: !disableAllButtons,
            tooltip: disableAllButtons ? 'Currently unavailable' : 'Start a fresh playthrough',
            icon: FiberNew
        },
        { 
            key: 'settings', 
            label: 'Settings', 
            onClick: handleSettings,
            enabled: !disableAllButtons,
            tooltip: disableAllButtons ? 'Currently unavailable' : 'Adjust game settings and preferences',
            icon: Settings
        }
    ];

    return (
        <BlurredBackground
            imageUrl="https://i.imgur.com/9hF0qda.gif" //https://media.charhub.io/41b7b65d-839b-4d31-8c11-64ee50e817df/0fc1e223-ad07-41c4-bdae-c9545d5c5e34.png"
            overlay="linear-gradient(45deg, rgba(0,17,34,0.3) 0%, rgba(0,34,68,0.3) 100%)"
        >
            <div 
                className="menu-screen" 
                style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh', 
                    width: '100vw'
                }}
            >
            {/* Background grid effect */}
            <GridOverlay />

            {/* Main menu container */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="glass-panel-bright"
                style={{
                    padding: 'clamp(20px, 5vh, 40px) clamp(20px, 5vw, 40px)',
                    minWidth: '300px',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxSizing: 'border-box',
                }}
            >
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <Title variant="glow" style={{ textAlign: 'center', marginBottom: 'clamp(20px, 5vh, 40px)', fontSize: 'clamp(18px, 5vw, 28px)' }}>
                        Post-Apocalypse Rehabilitation Center
                    </Title>
                </motion.div>

                {/* Menu buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2vh, 15px)' }}>
                    {menuButtons.map((button, index) => (
                        <motion.div
                            key={button.key}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ 
                                opacity: 1, 
                                x: hoveredButton === button.key && button.enabled ? 10 : 0
                            }}
                            transition={{ 
                                opacity: { delay: 0.4 + (index * 0.1), duration: 0.4, ease: 'easeOut' },
                                x: { duration: 0.2, ease: 'easeOut' }
                            }}
                            onMouseEnter={() => {
                                setHoveredButton(button.enabled ? button.key : null);
                                setTooltip(button.tooltip, button.icon);
                            }}
                            onMouseLeave={() => {
                                setHoveredButton(null);
                                clearTooltip();
                            }}
                        >
                            <Button
                                variant="menu"
                                whileTap={{ scale: button.enabled ? 0.95 : 1 }}
                                onClick={button.enabled ? button.onClick : undefined}
                                disabled={!button.enabled}
                                style={{
                                    width: '100%',
                                    fontSize: 'clamp(12px, 2.5vw, 16px)',
                                    padding: 'clamp(8px, 1.5vh, 12px) clamp(16px, 3vw, 24px)',
                                    background: button.enabled && hoveredButton === button.key 
                                        ? 'rgba(0, 255, 136, 0.2)' 
                                        : button.enabled ? 'transparent' : 'rgba(0, 20, 40, 0.5)'
                                }}
                            >
                                {button.label}
                            </Button>
                        </motion.div>
                    ))}
                </div>

                {/* Subtitle/version info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    style={{
                        textAlign: 'center',
                        marginTop: 'clamp(20px, 4vh, 30px)',
                        color: 'rgba(0, 255, 136, 0.6)',
                        fontSize: 'clamp(10px, 1.5vw, 12px)',
                    }}
                >
                    {'v2026.02.09 - Initial Release.'}
                </motion.div>
            </motion.div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <SettingsScreen
                    stage={stage}
                    onCancel={handleSettingsCancel}
                    onConfirm={handleSettingsConfirm}
                    isNewGame={isNewGameSettings}
                />
            )}
        </BlurredBackground>
    );
};