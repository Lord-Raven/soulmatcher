import { FC, useState, useEffect } from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { ScreenType } from './BaseScreen';
import { Stage } from '../Stage';
import { useTheme } from '@mui/material/styles';

/*
 * Loading screen that displays while content is being loaded.
 * Monitors the loadPromises and automatically transitions to the Studio screen when complete.
 */

interface LoadingScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
}

const LOADING_PHASES = [
    { message: "Finding compatible contestants...", duration: 15000, progress: 50 },
    { message: "Preparing the studio...", duration: Infinity, progress: 90 },
];

export const LoadingScreen: FC<LoadingScreenProps> = ({ stage, setScreenType }) => {
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const theme = useTheme();

    // Poll for completion of loading
    useEffect(() => {
        const interval = setInterval(() => {
            const loadPromises = stage().loadPromises;
            
            // If all load promises have completed (array is empty), transition to studio screen
            if (!loadPromises || loadPromises.length === 0) {
                setScreenType(ScreenType.STUDIO);
            }   
        }, 100);
        
        return () => clearInterval(interval);
    }, [stage, setScreenType]);

    // Handle phase transitions and progress animation
    useEffect(() => {
        const currentPhase = LOADING_PHASES[currentPhaseIndex];
        const targetProgress = currentPhase.progress;
        
        // Smoothly animate progress to target
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev < targetProgress) {
                    return Math.min(prev + 0.5, targetProgress);
                }
                return prev;
            });
        }, 50);

        // Move to next phase after duration (if not the last phase)
        let phaseTimeout: NodeJS.Timeout | null = null;
        if (currentPhaseIndex < LOADING_PHASES.length - 1) {
            phaseTimeout = setTimeout(() => {
                setCurrentPhaseIndex(prev => Math.min(prev + 1, LOADING_PHASES.length - 1));
            }, currentPhase.duration);
        }

        return () => {
            clearInterval(progressInterval);
            if (phaseTimeout) clearTimeout(phaseTimeout);
        };
    }, [currentPhaseIndex]);

    const currentPhase = LOADING_PHASES[currentPhaseIndex];

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                width: '100vw',
                background: 'linear-gradient(135deg, #1a0a2e 0%, #240741 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Animated background effect */}
            <Box
                className="grid-overlay"
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0.3,
                }}
            />

            <Box
                className="glass-panel-bright"
                sx={{
                    width: { xs: '90%', sm: '500px' },
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 4,
                    zIndex: 1,
                }}
            >
                <Typography
                    variant="h4"
                    className="text-gradient"
                    sx={{
                        fontWeight: 700,
                        marginBottom: 4,
                        textAlign: 'center',
                        fontSize: { xs: '1.5rem', sm: '2rem' },
                    }}
                >
                    SoulMatcher Loading
                </Typography>

                <Box sx={{ width: '100%', marginBottom: 2 }}>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 12,
                            borderRadius: 6,
                        }}
                    />
                </Box>

                <Typography
                    variant="body1"
                    sx={{
                        color: theme.palette.secondary.main,
                        fontWeight: 500,
                        textAlign: 'center',
                        minHeight: '24px',
                        textShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
                    }}
                >
                    {currentPhase.message}
                </Typography>
            </Box>
        </Box>
    );
};
