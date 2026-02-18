import { FC, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from '@mui/icons-material';
import { Actor } from '../Actor';
import { Emotion } from '../Emotion';
import { Button } from './UIComponents';
import { Curtain } from './Curtain';
import { BlurredBackground } from '@lord-raven/novel-visualizer';

interface CandidateSelectionUIProps {
    candidates: Actor[];
    maxSelections: number;
    onContinue: (selectedActorIds: string[]) => void;
    scenarioTitle: string;
    scenarioDescription?: string;
    isVerticalLayout: boolean;
    isProcessing?: boolean;
    processingLabel?: string;
}

/**
 * Reusable component for selecting candidates from a lineup
 * Can be used for:
 * - Finalist Selection (select 3 candidates)
 * - Final Voting (select 1 candidate)
 * 
 * Features:
 * - Visual lineup of candidates
 * - Selection management with max limit
 * - Progress indicator
 * - Continue button with validation
 */
export const CandidateSelectionUI: FC<CandidateSelectionUIProps> = ({
    candidates,
    maxSelections,
    onContinue,
    scenarioTitle,
    scenarioDescription,
    isVerticalLayout,
    isProcessing = false,
    processingLabel
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelection = (actorId: string) => {
        if (isProcessing) {
            return;
        }
        setSelectedIds(prev => {
            if (prev.includes(actorId)) {
                // Deselect
                return prev.filter(id => id !== actorId);
            } else {
                // Select if we haven't reached the limit
                if (prev.length < maxSelections) {
                    return [...prev, actorId];
                }
                return prev;
            }
        });
    };

    const isSelectionComplete = selectedIds.length === maxSelections;
    const gridColumnTemplate = `repeat(${candidates.length}, minmax(0, 1fr))`;

    return (
        <BlurredBackground
            imageUrl="https://media.charhub.io/d41042d5-5860-4f76-85ac-885e65e92c2b/95fdc548-1c75-4101-a62e-65fc90a97437.png"
            overlay="linear-gradient(135deg, rgba(26, 10, 46, 0.7) 0%, rgba(36, 7, 65, 0.8) 100%)"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
            >
                <Box
                    sx={{
                        padding: isVerticalLayout ? '16px' : '32px',
                        minHeight: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        gap: 3,
                        position: 'relative',
                    }}
                >
                {/* Curtain Overlay */}
                <Curtain position="down" />

                {isProcessing && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            zIndex: 20,
                        }}
                    >
                        <CircularProgress size={56} sx={{ color: '#FFD700' }} />
                        <Typography
                            variant="body1"
                            sx={{
                                color: '#FFD700',
                                textAlign: 'center',
                                paddingX: 2,
                            }}
                        >
                            {processingLabel || 'Tabulating Cupid and audience votes...'}
                        </Typography>
                    </Box>
                )}
                {/* Header Section */}
                <Box
                    sx={{
                        textAlign: 'center',
                        marginTop: isVerticalLayout ? 2 : 4,
                        position: 'relative',
                        zIndex: 10,
                    }}
                >
                    <Typography
                        variant="h3"
                        sx={{
                            color: '#FFD700',
                            fontWeight: 'bold',
                            marginBottom: 1,
                            textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                            fontSize: isVerticalLayout ? '1.8rem' : '2.5rem',
                        }}
                    >
                        {scenarioTitle}
                    </Typography>
                    {scenarioDescription && (
                        <Typography
                            variant="body1"
                            sx={{
                                color: 'rgba(255, 255, 255, 0.8)',
                                maxWidth: '600px',
                                margin: '0 auto',
                            }}
                        >
                            {scenarioDescription}
                        </Typography>
                    )}
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'rgba(255, 215, 0, 0.7)',
                            marginTop: 1,
                        }}
                    >
                        Select {maxSelections} candidate{maxSelections !== 1 ? 's' : ''} ({selectedIds.length} / {maxSelections})
                    </Typography>
                </Box>

                {/* Candidates Grid */}
                <Box
                    sx={{
                        width: '100%',
                        display: 'grid',
                        gridAutoFlow: 'column',
                        gridTemplateColumns: gridColumnTemplate,
                        gap: 2,
                        alignItems: 'stretch',
                        pointerEvents: isProcessing ? 'none' : 'auto',
                        position: 'relative',
                        zIndex: 10,
                    }}
                >
                    <AnimatePresence>
                        {candidates.map((candidate, index) => {
                            const isSelected = selectedIds.includes(candidate.id);
                            const neutralImage = candidate.emotionPack[Emotion.neutral];

                            return (
                                <Box
                                    key={candidate.id}
                                    sx={{
                                        minWidth: 0,
                                        display: 'flex',
                                    }}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{
                                            duration: 0.3,
                                            delay: index * 0.1,
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                        }}
                                    >
                                        <Paper
                                            elevation={isSelected ? 12 : 3}
                                            onClick={() => toggleSelection(candidate.id)}
                                            sx={{
                                                cursor: 'pointer',
                                                padding: 2,
                                                textAlign: 'center',
                                                backgroundColor: isSelected
                                                    ? 'rgba(255, 215, 0, 0.15)'
                                                    : 'rgba(255, 255, 255, 0.05)',
                                                border: isSelected
                                                    ? `3px solid ${candidate.themeColor || '#FFD700'}`
                                                    : '2px solid rgba(255, 255, 255, 0.2)',
                                                transition: 'all 0.2s ease',
                                                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    border: `2px solid ${candidate.themeColor || '#FFD700'}`,
                                                    transform: 'scale(1.02)',
                                                },
                                                backdropFilter: 'blur(8px)',
                                                width: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            {/* Character Image */}
                                            <Box
                                                sx={{
                                                    position: 'relative',
                                                    marginBottom: 2,
                                                    borderRadius: 2,
                                                    overflow: 'hidden',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                    aspectRatio: '1/1',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                {neutralImage && (
                                                    <Box
                                                        component="img"
                                                        src={neutralImage}
                                                        alt={candidate.name}
                                                        sx={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'contain',
                                                            filter: isSelected ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))' : 'none',
                                                        }}
                                                    />
                                                )}

                                                {/* Selection Indicator */}
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: isSelected ? 1 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 8,
                                                        right: 8,
                                                    }}
                                                >
                                                    <CheckCircle
                                                        sx={{
                                                            fontSize: '2rem',
                                                            color: candidate.themeColor || '#FFD700',
                                                            filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.8))',
                                                        }}
                                                    />
                                                </motion.div>
                                            </Box>

                                            {/* Name and Profile */}
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    color: candidate.themeColor || '#FFD700',
                                                    fontWeight: 'bold',
                                                    marginBottom: 1,
                                                    fontFamily: candidate.themeFontFamily || 'inherit',
                                                }}
                                            >
                                                {candidate.name}
                                            </Typography>

                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                    display: '-webkit-box',
                                                    overflow: 'hidden',
                                                    WebkitBoxOrient: 'vertical',
                                                    WebkitLineClamp: 3,
                                                    fontSize: '0.75rem',
                                                    lineHeight: 1.3,
                                                }}
                                            >
                                                {candidate.profile}
                                            </Typography>
                                        </Paper>
                                    </motion.div>
                                </Box>
                            );
                        })}
                    </AnimatePresence>
                </Box>

                {/* Continue Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    style={{
                        pointerEvents: isProcessing ? 'none' : 'auto',
                        position: 'relative',
                        zIndex: 10,
                    }}
                >
                    <Button
                        variant="primary"
                        disabled={!isSelectionComplete || isProcessing}
                        onClick={() => onContinue(selectedIds)}
                        style={{
                            opacity: isSelectionComplete ? 1 : 0.5,
                            padding: isVerticalLayout ? '12px 32px' : '16px 48px',
                            fontSize: isVerticalLayout ? '1rem' : '1.2rem',
                        }}
                    >
                        {maxSelections === 1 ? 'Choose This Person' : 'Continue with These Finalists'}
                    </Button>
                </motion.div>
                </Box>
            </motion.div>
        </BlurredBackground>
    );
};
