import { FC, useMemo } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { Actor } from '../Actor';
import { Button } from './UIComponents';

interface FinalResultsScreenProps {
    finalists: Actor[];
    playerChoiceId: string | null;
    hostChoiceId: string | null;
    audienceChoiceId: string | null;
    winnerId: string | null;
    isReady: boolean;
    onAccept: () => void;
    isVerticalLayout: boolean;
}

type VoteTally = {
    count: number;
    voters: string[];
};

const sparkleConfig = [
    { top: '12%', left: '10%', size: 10, delay: 0.2 },
    { top: '20%', left: '80%', size: 8, delay: 0.6 },
    { top: '65%', left: '15%', size: 12, delay: 1.1 },
    { top: '72%', left: '85%', size: 9, delay: 0.8 },
    { top: '40%', left: '55%', size: 7, delay: 0.4 },
];

export const FinalResultsScreen: FC<FinalResultsScreenProps> = ({
    finalists,
    playerChoiceId,
    hostChoiceId,
    audienceChoiceId,
    winnerId,
    isReady,
    onAccept,
    isVerticalLayout,
}) => {
    const tally = useMemo(() => {
        const initial: Record<string, VoteTally> = {};
        finalists.forEach(finalist => {
            initial[finalist.id] = { count: 0, voters: [] };
        });

        const applyVote = (actorId: string | null, label: string) => {
            if (!actorId || !initial[actorId]) {
                return;
            }
            initial[actorId].count += 1;
            initial[actorId].voters.push(label);
        };

        applyVote(playerChoiceId, 'You');
        applyVote(hostChoiceId, 'Cupid');
        applyVote(audienceChoiceId, 'Audience');

        return initial;
    }, [finalists, playerChoiceId, hostChoiceId, audienceChoiceId]);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                padding: isVerticalLayout ? '20px 16px' : '36px 48px',
                background: 'radial-gradient(circle at top, rgba(255, 215, 0, 0.18), rgba(10, 10, 18, 0.95) 55%), linear-gradient(135deg, rgba(12, 12, 24, 0.95), rgba(30, 8, 34, 0.9))',
                color: '#ffffff',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                alignItems: 'center',
            }}
        >
            {sparkleConfig.map((sparkle, index) => (
                <motion.div
                    key={index}
                    style={{
                        position: 'absolute',
                        top: sparkle.top,
                        left: sparkle.left,
                        width: sparkle.size,
                        height: sparkle.size,
                        borderRadius: '50%',
                        background: 'rgba(255, 215, 0, 0.9)',
                        boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)',
                    }}
                    animate={{
                        y: [0, -12, 0],
                        opacity: [0, 1, 0],
                        scale: [0.6, 1.2, 0.6],
                    }}
                    transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        delay: sparkle.delay,
                        ease: 'easeInOut',
                    }}
                />
            ))}

            <Box sx={{ textAlign: 'center', marginTop: isVerticalLayout ? 2 : 4 }}>
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 700,
                        color: '#FFD700',
                        textShadow: '0 0 20px rgba(255, 215, 0, 0.45)',
                        fontSize: isVerticalLayout ? '2rem' : '2.8rem',
                    }}
                >
                    Final Results
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: 'rgba(255, 255, 255, 0.8)',
                        marginTop: 1,
                        maxWidth: 520,
                        marginInline: 'auto',
                    }}
                >
                    Cupid and the audience have spoken. Here is how the votes landed.
                </Typography>
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: isVerticalLayout ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 2,
                    width: '100%',
                    maxWidth: 980,
                }}
            >
                {finalists.map(finalist => {
                    const voteData = tally[finalist.id] || { count: 0, voters: [] };
                    const isWinner = finalist.id === winnerId;

                    return (
                        <motion.div
                            key={finalist.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ width: '100%' }}
                        >
                            <Box
                                sx={{
                                    padding: 2.5,
                                    borderRadius: 3,
                                    border: isWinner
                                        ? `2px solid ${finalist.themeColor || '#FFD700'}`
                                        : '1px solid rgba(255, 255, 255, 0.15)',
                                    background: isWinner
                                        ? 'rgba(255, 215, 0, 0.12)'
                                        : 'rgba(0, 0, 0, 0.35)',
                                    boxShadow: isWinner
                                        ? '0 0 18px rgba(255, 215, 0, 0.45)'
                                        : '0 0 12px rgba(0, 0, 0, 0.35)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {isWinner && (
                                    <motion.div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'linear-gradient(120deg, rgba(255, 215, 0, 0.05), rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05))',
                                            opacity: 0.6,
                                        }}
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{
                                            duration: 2.6,
                                            repeat: Infinity,
                                            ease: 'easeInOut',
                                        }}
                                    />
                                )}

                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: finalist.themeColor || '#FFD700',
                                        fontWeight: 700,
                                        fontFamily: finalist.themeFontFamily || 'inherit',
                                        textShadow: isWinner ? '0 0 12px rgba(255, 215, 0, 0.4)' : 'none',
                                        position: 'relative',
                                        zIndex: 1,
                                    }}
                                >
                                    {finalist.name}
                                </Typography>

                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        marginTop: 1,
                                        position: 'relative',
                                        zIndex: 1,
                                    }}
                                >
                                    Votes: {voteData.count}
                                </Typography>

                                <Box
                                    sx={{
                                        marginTop: 1,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 1,
                                        position: 'relative',
                                        zIndex: 1,
                                    }}
                                >
                                    {voteData.voters.length === 0 ? (
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                            No votes this round
                                        </Typography>
                                    ) : (
                                        voteData.voters.map(voter => (
                                            <Box
                                                key={`${finalist.id}-${voter}`}
                                                sx={{
                                                    padding: '4px 10px',
                                                    borderRadius: 999,
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    fontSize: '0.7rem',
                                                    letterSpacing: '0.04em',
                                                    textTransform: 'uppercase',
                                                    color: 'rgba(255, 255, 255, 0.75)',
                                                }}
                                            >
                                                {voter}
                                            </Box>
                                        ))
                                    )}
                                </Box>

                                {isWinner && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'inline-block',
                                            marginTop: 1.5,
                                            color: '#FFD700',
                                            fontWeight: 700,
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            position: 'relative',
                                            zIndex: 1,
                                        }}
                                    >
                                        Winner
                                    </Typography>
                                )}
                            </Box>
                        </motion.div>
                    );
                })}
            </Box>

            <Box
                sx={{
                    marginTop: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5,
                }}
            >
                {!isReady && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CircularProgress size={20} sx={{ color: '#FFD700' }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Preparing the finale...
                        </Typography>
                    </Box>
                )}
                <Button
                    variant="primary"
                    disabled={!isReady}
                    onClick={onAccept}
                    style={{
                        padding: isVerticalLayout ? '12px 32px' : '14px 48px',
                        fontSize: isVerticalLayout ? '1rem' : '1.1rem',
                        opacity: isReady ? 1 : 0.6,
                    }}
                >
                    {isReady ? 'Reveal the Finale' : 'Finale Loading'}
                </Button>
            </Box>
        </Box>
    );
};
