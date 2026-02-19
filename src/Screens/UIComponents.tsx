/**
 * Shared UI Components
 * Reusable components for the SoulMatcher retro gameshow theme
 * Uses Material UI components and custom styling
 */

import React, { FC, ReactNode } from 'react';
import { Actor } from '../Actor';
import { motion, HTMLMotionProps } from 'framer-motion';
import { HourglassTop, HourglassBottom } from '@mui/icons-material';
import { Box, Paper, Button as MuiButton, TextField, Chip as MuiChip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

/* ===============================================
   PANEL COMPONENTS (Using MUI Paper with custom styling)
   =============================================== */

interface GlassPanelProps {
	variant?: 'default' | 'bright';
	children: ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

export const GlassPanel: FC<GlassPanelProps> = ({ 
	variant = 'default', 
	children, 
	className = '',
	style,
}) => {
	return (
		<Box 
			className={variant === 'bright' ? 'glass-panel-bright' : 'glass-panel'}
			sx={{
				padding: '24px',
				...style
			}}
		>
			{children}
		</Box>
	);
};

/* ===============================================
   BUTTON COMPONENTS (Wrapping MUI Button)
   =============================================== */

interface ButtonProps {
	variant?: 'primary' | 'secondary' | 'menu';
	children: ReactNode;
	disabled?: boolean;
	onClick?: () => void;
	style?: React.CSSProperties;
	className?: string;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
}

export const Button: FC<ButtonProps> = ({ 
	variant = 'primary', 
	children, 
	disabled = false,
	onClick,
	className = '',
	style,
	onMouseEnter,
	onMouseLeave,
}) => {
	const buttonClass = `btn-${variant}`;
	
	return (
		<motion.button
			className={`${buttonClass} ${className}`}
			disabled={disabled}
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			whileHover={!disabled ? { scale: variant === 'menu' ? 1 : 1.03 } : {}}
			whileTap={!disabled ? { scale: 0.98 } : {}}
			style={{
				height: 'fit-content',
				alignSelf: 'center',
				...style
			}}
		>
			{children}
		</motion.button>
	);
};

/* ===============================================
   BACKGROUND COMPONENTS
   =============================================== */

interface GridOverlayProps {
	size?: number;
}

export const GridOverlay: FC<GridOverlayProps> = ({ size = 60 }) => {
	return (
		<div 
			className="grid-overlay"
			style={{
				backgroundSize: `${size}px ${size}px`
			}}
		/>
	);
};

/* ===============================================
   PROGRESS INDICATORS (Custom for gameshow theme)
   =============================================== */

interface TurnIndicatorProps {
	currentTurn: number;
	totalTurns: number;
}

export const TurnIndicator: FC<TurnIndicatorProps> = ({ currentTurn, totalTurns }) => {
	return (
		<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
			{Array.from({ length: totalTurns }).map((_, index) => {
				const isSpent = index < currentTurn;
				const HourglassIcon = isSpent ? HourglassTop : HourglassBottom;
				
				return (
					<motion.div
						key={index}
						initial={{ scale: 0, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ 
							duration: 0.3, 
							delay: index * 0.1,
							ease: "easeOut"
						}}
						whileHover={{ 
							scale: 1.2,
							transition: { duration: 0.2 }
						}}
					>
						<HourglassIcon
							sx={{
								color: isSpent ? 'rgba(255, 215, 0, 0.4)' : '#FFD700',
								filter: isSpent ? 'none' : 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))',
								fontSize: '28px',
							}}
						/>
					</motion.div>
				);
			})}
		</Box>
	);
};

/* ===============================================
   TEXT COMPONENTS (Using MUI Typography)
   =============================================== */

interface TitleProps {
	variant?: 'primary' | 'glow';
	children: ReactNode;
	style?: React.CSSProperties;
	className?: string;
}

export const Title: FC<TitleProps> = ({ 
	variant = 'primary', 
	children,
	style,
	className = ''
}) => {
	const textClass = variant === 'primary' ? 'text-glow-primary' : 'text-gradient';
	
	return (
		<Typography 
			variant="h1" 
			className={`${textClass} ${className}`} 
			sx={{ 
				fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
				...style 
			}}
		>
			{children}
		</Typography>
	);
};

/* ===============================================
   NAMEPLATE COMPONENT
   =============================================== */

interface NamePlateProps {
	actor?: Actor;
	size?: 'sm' | 'md' | 'lg';
	style?: React.CSSProperties;
	className?: string;
}

export const NamePlate: FC<NamePlateProps> = ({
	actor,
	size = 'md',
	style,
	className = ''
}) => {
	if (!actor) {
		return null;
	}

	const sizeStyles = {
		sm: { fontSize: '2rem', padding: '4px 4px', minHeight: '32px' },
		md: { fontSize: '2.4rem', padding: '4px 2px', minHeight: '32px' },
		lg: { fontSize: '3rem', padding: '4px 8px', minHeight: '40px' }
	};

	const nameplateColor = actor.themeColor || '#FFD700';

	return (
		<Box
			className={className}
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				position: 'relative',
				overflow: 'hidden',
				borderRadius: '10px',
				backgroundColor: nameplateColor,
				backgroundImage: 'linear-gradient(135deg, rgba(255, 20, 147, 0.25), rgba(255, 215, 0, 0.25))',
				border: '1px solid rgba(255, 215, 0, 0.6)',
				boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
				color: '#ffffff',
				textShadow: '0 2px 4px rgba(0, 0, 0, 0.65)',
				letterSpacing: '0.04em',
				fontWeight: 700,
				...sizeStyles[size],
				...style,
				'&::after': {
					content: '""',
					position: 'absolute',
					inset: 0,
					background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 60%)',
					opacity: 0.35,
					pointerEvents: 'none'
				}
			}}
		>
			<Typography
				component="span"
				sx={{
					fontFamily: actor.themeFontFamily || 'inherit',
					position: 'relative',
					zIndex: 1
				}}
			>
				{actor.name}
			</Typography>
		</Box>
	);
};

/* ===============================================
   INPUT COMPONENTS (Using MUI TextField)
   =============================================== */

interface TextInputProps {
	fullWidth?: boolean;
	value?: string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onFocus?: () => void;
	onBlur?: () => void;
	placeholder?: string;
	id?: string;
	style?: React.CSSProperties;
	className?: string;
}

export const TextInput: FC<TextInputProps> = ({ 
	fullWidth = false,
	className = '',
	style,
	...props 
}) => {
	return (
		<input
			className={`input-base ${className}`}
			style={{
				width: fullWidth ? '100%' : 'auto',
				...style
			}}
			{...props}
		/>
	);
};

/* ===============================================
   CHIP/BADGE COMPONENTS (Using MUI Chip)
   =============================================== */

interface ChipProps {
	children: ReactNode;
	style?: React.CSSProperties;
	className?: string;
}

export const Chip: FC<ChipProps> = ({ 
	children,
	style,
	className = ''
}) => {
	return (
		<MuiChip 
			label={children}
			className={className}
			sx={{ ...style }}
		/>
	);
};

/* ===============================================
   EXPANDABLE MENU ITEM
   =============================================== */

interface MenuItemProps {
	title: string;
	isExpanded: boolean;
	onToggle: () => void;
	children: ReactNode;
}

export const MenuItem: FC<MenuItemProps> = ({ 
	title, 
	isExpanded, 
	onToggle, 
	children 
}) => {
	const [isHovered, setIsHovered] = React.useState(false);
	
	return (
		<motion.div 
			layout
			style={{ margin: '10px 0' }}
			animate={{ x: isHovered ? 10 : 0 }}
			transition={{ 
				layout: { duration: 0.3, ease: 'easeInOut' },
				x: { duration: 0.2, ease: 'easeOut' }
			}}
		>
			<motion.button
				onClick={onToggle}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				whileTap={{ scale: 0.95 }}
				className="btn-menu"
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					background: isExpanded ? 'rgba(255, 20, 147, 0.15)' : 'transparent',
				}}
			>
				<span>{title}</span>
				<motion.span
					animate={{ rotate: isExpanded ? 180 : 0 }}
					transition={{ duration: 0.3 }}
				>
					▼
				</motion.span>
			</motion.button>
			
			<motion.div
				layout
				initial={{ height: 0, opacity: 0 }}
				animate={{ 
					height: isExpanded ? 'auto' : 0,
					opacity: isExpanded ? 1 : 0
				}}
				transition={{ 
					height: { duration: 0.3, ease: 'easeInOut' },
					opacity: { duration: 0.2, ease: 'easeInOut' }
				}}
				style={{ 
					overflow: 'hidden',
					background: 'rgba(36, 7, 65, 0.7)',
					border: isExpanded ? '2px solid rgba(255, 20, 147, 0.3)' : 'none',
					borderTop: 'none',
					borderRadius: '0 0 8px 8px',
				}}
			>
				<div style={{ padding: '15px' }}>
					{children}
				</div>
			</motion.div>
		</motion.div>
	);
};
