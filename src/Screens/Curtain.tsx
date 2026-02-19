import { FC, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Box } from '@mui/material';

interface CurtainProps {
    /**
     * Position of the curtain:
     * - 'down': Curtain is fully visible covering the background
     * - 'up': Curtain is raised/off-screen
     */
    position: 'up' | 'down';
    /** URL of the curtain image */
    imageUrl?: string;
    /** Z-index for layering. Default is 5 for standard use. */
    zIndex?: number;
    /** Optional children to render inside the curtain container (rare usage) */
    children?: ReactNode;
}

const CURTAIN_IMAGE = 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/06264878-6fb6-4e34-bb06-da19725f22f9/3633b3c0-8eba-4621-8ab1-02ab06205d28.png';

/**
 * Animated curtain component that slides up/down over the background.
 * The curtain is positioned at the top center of the screen and can be animated
 * to reveal or cover the background behind it.
 * 
 * The component includes its own wrapper positioning, so you don't need to wrap it
 * in a Box or div. Just use it directly:
 * 
 * @example
 * <Curtain position="down" />
 * <Curtain position="up" zIndex={100} />
 */
export const Curtain: FC<CurtainProps> = ({ 
    position = 'down',
    imageUrl = CURTAIN_IMAGE,
    zIndex = 5,
    children
}) => {
    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                width: '100%',
                zIndex,
            }}
        >
            <motion.div
                animate={{
                    y: position === 'down' ? 0 : -1000,
                }}
                transition={{
                    duration: 0.6,
                    ease: 'easeInOut',
                }}
                style={{
                    width: '100%',
                    height: 'auto',
                    pointerEvents: 'none',
                }}
            >
                <Box
                    component="img"
                    src={imageUrl}
                    alt="Curtain"
                    sx={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        filter: 'blur(1px)',
                        userSelect: 'none',
                        WebkitUserDrag: 'none',
                    }}
                />
                {children}
            </motion.div>
        </Box>
    );
};
