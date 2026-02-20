import React, { FC } from 'react';
import { Stage, GamePhase } from '../Stage';
import { MenuScreen } from './MenuScreen';
import { LoadingScreen } from './LoadingScreen';
import { TooltipProvider, useTooltip } from './TooltipContext';
import TooltipBar from './TooltipBar';
import { StudioScreen } from './StudioScreen';
import { ThemeProvider } from '@mui/material';
import theme from '../theme';
import { Curtain } from './Curtain';

/*
 * Base screen management; the Stage class will display this, and this will track the current screen being displayed.
 */

export enum ScreenType {
    MENU = 'menu',
    LOADING = 'loading',
    STUDIO = 'studio',
}

interface BaseScreenProps {
    stage: () => Stage;
}

const BaseScreenContent: FC<{ stage: () => Stage }> = ({ stage }) => {
    const [screenType, setScreenType] = React.useState<ScreenType>(ScreenType.MENU);
    const [isVerticalLayout, setIsVerticalLayout] = React.useState<boolean>(stage().isVerticalLayout());
    const { message, icon, clearTooltip, setPriorityMessage } = useTooltip();

    // Determine curtain position based on screen type and game phase
    const getCurtainPosition = (): 'up' | 'down' => {
        if (screenType === ScreenType.MENU || screenType === ScreenType.LOADING) {
            return 'down';
        }
        if (screenType === ScreenType.STUDIO) {
            const currentPhase = stage().getCurrentPhase();
            // Curtain is down during epilogue phase
            return currentPhase === GamePhase.EPILOGUE ? 'down' : 'up';
        }
        return 'down';
    };

    // Set up the priority message callback in the stage
    React.useEffect(() => {
        stage().setPriorityMessageCallback(setPriorityMessage);
    }, [setPriorityMessage]);

    // Update layout orientation on resize
    React.useEffect(() => {
        const handleResize = () => {
            setIsVerticalLayout(stage().isVerticalLayout());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Clear tooltip whenever screen type changes
    React.useEffect(() => {
        clearTooltip();
    }, [screenType]);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            {screenType === ScreenType.MENU && (
                // Render menu screen
                <MenuScreen stage={stage} setScreenType={setScreenType} />
            )}
            {screenType === ScreenType.LOADING && (
                // Render loading screen
                <LoadingScreen stage={stage} setScreenType={setScreenType} />
            )}
            {screenType === ScreenType.STUDIO && (
                // Render studio screen
                <StudioScreen 
                    stage={stage} 
                    setScreenType={setScreenType} 
                    isVerticalLayout={isVerticalLayout}
                    curtainPosition={getCurtainPosition()}
                />
            )}
            {/* Unified tooltip bar that renders over all screens */}
            <TooltipBar 
                message={message} 
                Icon={icon}
                onDismiss={clearTooltip}
                isVerticalLayout={isVerticalLayout}
            />
        </div>
    );
};

export const BaseScreen: FC<BaseScreenProps> = ({ stage }) => {
    return (
        <ThemeProvider theme={theme}>
            <TooltipProvider>
                <BaseScreenContent stage={stage} />
            </TooltipProvider>
        </ThemeProvider>
    );
}