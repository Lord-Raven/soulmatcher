import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stage } from '../Stage';
import { GlassPanel, Title, Button, TextInput } from './UIComponents';
import { Close } from '@mui/icons-material';

interface SettingsScreenProps {
    stage: () => Stage;
    onCancel: () => void;
    onConfirm: () => void;
    isNewGame?: boolean;
}

interface SettingsData {
    playerName: string;
    playerDescription: string;
    disableTextToSpeech: boolean;
    tagToggles: { [key: string]: boolean };
    language: string;
    spice: number;  // 1-3 scale for content rating
}

export const SettingsScreen: FC<SettingsScreenProps> = ({ stage, onCancel, onConfirm, isNewGame = false }) => {

    // Common languages for autocomplete
    const commonLanguages = [
        'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese',
        'Korean', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Arabic', 'Hindi', 'Bengali',
        'Urdu', 'Indonesian', 'Turkish', 'Vietnamese', 'Thai', 'Polish', 'Dutch', 'Swedish',
        'Norwegian', 'Danish', 'Finnish', 'Greek', 'Hebrew', 'Czech', 'Hungarian', 'Romanian',
        'Ukrainian', 'Catalan', 'Serbian', 'Croatian', 'Bulgarian', 'Slovak', 'Lithuanian',
        'Latvian', 'Estonian', 'Slovenian', 'Malay', 'Tagalog', 'Swahili', 'Afrikaans', 'Catalan'
    ];

    // Each toggle can map to multiple tags when saved.
    const tagMap: { [key: string]: string[] } = {
        'Male': ['Male', 'Boy', 'Man'],
        'Female': ['Female', 'Girl', 'Woman'],
        'Transgender': ['Trans', 'Transgender', 'Transexual','Transfem','Transmasc'],
        'Futanari': ['Futanari', 'Futa'],
        'Bisexual': ['Bisexual', 'Bi'],
        'Gay': ['Gay'],
        'Lesbian': ['Lesbian'],
        'Asexual': ['Asexual', 'Ace'],
        'Human': ['Human'],
        'Non-Human': ['Non-Human'],
        'Anthro': ['Anthro', 'Furry'],
        'Robot': ['Robot', 'Android', 'Cyborg'],
        'Elf': ['Elf', 'Elven', 'Dark Elf'],
        'Monster': ['Monster', 'Beast', 'Creature', 'Monstergirl'],
        'Original Character': ['Original Character', 'OC', 'Original'],
    }

    // Load existing settings or use defaults
    const [settings, setSettings] = useState<SettingsData>({
        playerName: stage().getPlayerActor()?.name || stage().primaryUser?.name || 'Player',
        playerDescription: stage().getPlayerActor()?.description || stage().primaryUser?.chatProfile ||'An enimgmatic contestant on Soulmatcher!',
        disableTextToSpeech: stage().saveData.disableTextToSpeech ?? false,
        language: stage().saveData.language || 'English',
        spice: stage().saveData.spice ?? 2,  // Default to middle of scale
        // Tag toggles; disabling these can be used to filter undesired content. Load from save array, if one. Otherwise, default to true.
        tagToggles: stage().saveData.bannedTags ? Object.fromEntries(
            Object.keys(tagMap).map(key => [
                key, !stage().saveData.bannedTags?.some(bannedTag => tagMap[key].includes(bannedTag))
            ])
        ) : Object.keys(tagMap).reduce((acc, key) => ({...acc, [key]: true}), {})
    });

    const [languageSuggestions, setLanguageSuggestions] = useState<string[]>([]);
    const [showLanguageSuggestions, setShowLanguageSuggestions] = useState(false);

    const handleSave = () => {
        console.log('Saving settings:', settings);

        stage().saveData.bannedTags = Object.keys(settings.tagToggles).filter(key => !settings.tagToggles[key]).map(key => tagMap[key] ? tagMap[key] : [key]).flat();
        stage().saveData.disableTextToSpeech = settings.disableTextToSpeech;
        stage().saveData.language = settings.language;
        stage().saveData.spice = settings.spice;
        
        if (isNewGame) {
            console.log('Starting new game with settings');
            stage().startNewGame({
                name: settings.playerName,
                description: settings.playerDescription,
            });
        } else {
            console.log('Updating settings');
            const player = stage().getPlayerActor();
            player.name = settings.playerName;
            player.description = settings.playerDescription;
        }

        stage().saveGame();
        onConfirm();
    };

    const handleToggle = (key: string) => {
        setSettings(prev => ({
            ...prev,
            tagToggles: {
                ...prev.tagToggles,
                [key]: !prev.tagToggles[key]
            }
        }));
    };

    const handleInputChange = (field: keyof SettingsData, value: string) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleLanguageChange = (value: string) => {
        setSettings(prev => ({ ...prev, language: value }));
        
        // Filter and update suggestions
        if (value.trim()) {
            const filtered = commonLanguages.filter(lang => 
                lang.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 8); // Limit to 8 suggestions
            setLanguageSuggestions(filtered);
            setShowLanguageSuggestions(filtered.length > 0);
        } else {
            setLanguageSuggestions([]);
            setShowLanguageSuggestions(false);
        }
    };

    const selectLanguage = (language: string) => {
        setSettings(prev => ({ ...prev, language }));
        setShowLanguageSuggestions(false);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 10, 20, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px',
                }}
                onClick={(e) => {
                    // Close if clicking backdrop (but not during new game setup)
                    // Don't close if user is selecting text
                    const selection = window.getSelection();
                    const hasSelection = selection && selection.toString().length > 0;
                    
                    if (e.target === e.currentTarget && !isNewGame && !hasSelection) {
                        onCancel();
                    }
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 50 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GlassPanel 
                        variant="bright"
                        style={{
                            width: '80vw',
                            maxHeight: '85vh',
                            overflow: 'auto',
                            position: 'relative',
                            padding: '30px',
                        }}
                    >
                        {/* Header with close button */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '20px'
                        }}>
                            <Title variant="glow" style={{ fontSize: '24px', margin: 0 }}>
                                {isNewGame ? 'New Game Setup' : 'Settings'}
                            </Title>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onCancel}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255, 20, 147, 0.7)',
                                    cursor: 'pointer',
                                    fontSize: '24px',
                                    padding: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Close />
                            </motion.button>
                        </div>

                        {/* Settings Form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Player Name */}
                            <div>
                                <label 
                                    htmlFor="player-name"
                                    style={{
                                        display: 'block',
                                        color: '#FFD700',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                    }}
                                >
                                    Contestant Name
                                </label>
                                <TextInput
                                    id="player-name"
                                    fullWidth
                                    value={settings.playerName}
                                    onChange={(e) => handleInputChange('playerName', e.target.value)}
                                    placeholder="Enter your name"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>

                            {/* Player Description */}
                            <div>
                                <label 
                                    htmlFor="player-description"
                                    style={{
                                        display: 'block',
                                        color: '#FFD700',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                    }}
                                >
                                    Contestant Bio
                                </label>
                                <textarea
                                    id="player-description"
                                    className="input-base"
                                    value={settings.playerDescription}
                                    onChange={(e) => handleInputChange('playerDescription', e.target.value)}
                                    placeholder="Describe your character..."
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            {/* Generation Settings */}
                            <div>
                                <label 
                                    style={{
                                        display: 'block',
                                        color: '#FFD700',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '12px',
                                    }}
                                >
                                    Show Settings
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Disable Text to Speech Toggle */}
                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => setSettings(prev => ({ ...prev, disableTextToSpeech: !prev.disableTextToSpeech }))}
                                        style={{
                                            padding: '12px',
                                            background: settings.disableTextToSpeech
                                                ? 'rgba(255, 20, 147, 0.15)'
                                                : 'rgba(36, 7, 65, 0.7)',
                                            border: settings.disableTextToSpeech
                                                ? '2px solid rgba(255, 20, 147, 0.5)'
                                                : '2px solid rgba(255, 215, 0, 0.3)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '4px',
                                                background: settings.disableTextToSpeech ? '#FF1493' : 'rgba(255, 255, 255, 0.1)',
                                                border: '2px solid ' + (settings.disableTextToSpeech ? '#FF1493' : 'rgba(255, 215, 0, 0.3)'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {settings.disableTextToSpeech && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    style={{
                                                        color: '#FFFFFF',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                    }}
                                                >
                                                    ✓
                                                </motion.span>
                                            )}
                                        </div>
                                        <span
                                            style={{
                                                color: settings.disableTextToSpeech ? '#FF1493' : 'rgba(255, 255, 255, 0.7)',
                                                fontSize: '13px',
                                                fontWeight: settings.disableTextToSpeech ? 'bold' : 'normal',
                                            }}
                                        >
                                            Disable Text to Speech
                                        </span>
                                    </motion.div>

                                    {/* Language Input */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label
                                            htmlFor="language-input"
                                            style={{
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            Language
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <TextInput
                                                id="language-input"
                                                fullWidth
                                                value={settings.language}
                                                onChange={(e) => handleLanguageChange(e.target.value)}
                                                onFocus={() => {
                                                    if (settings.language.trim()) {
                                                        handleLanguageChange(settings.language);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    // Delay to allow clicking on suggestions
                                                    setTimeout(() => setShowLanguageSuggestions(false), 200);
                                                }}
                                                placeholder="Enter any language or style..."
                                                style={{ fontSize: '13px' }}
                                            />
                                            {/* Language suggestions dropdown */}
                                            <AnimatePresence>
                                                {showLanguageSuggestions && languageSuggestions.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.15 }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '100%',
                                                            left: 0,
                                                            right: 0,
                                                            marginTop: '4px',
                                                            background: 'rgba(36, 7, 65, 0.95)',
                                                            border: '2px solid rgba(255, 20, 147, 0.5)',
                                                            borderRadius: '8px',
                                                            overflow: 'hidden',
                                                            zIndex: 1000,
                                                            maxHeight: '200px',
                                                            overflowY: 'auto',
                                                        }}
                                                    >
                                                        {languageSuggestions.map((lang, index) => (
                                                            <motion.div
                                                                key={lang}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: index * 0.02 }}
                                                                onClick={() => selectLanguage(lang)}
                                                                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                                                style={{
                                                                    padding: '10px 12px',
                                                                    cursor: 'pointer',
                                                                    color: 'rgba(255, 255, 255, 0.8)',
                                                                    fontSize: '13px',
                                                                    transition: 'all 0.15s ease',
                                                                    borderBottom: index < languageSuggestions.length - 1 
                                                                        ? '1px solid rgba(255, 20, 147, 0.1)' 
                                                                        : 'none',
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(255, 20, 147, 0.15)';
                                                                    e.currentTarget.style.color = '#FF1493';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = 'transparent';
                                                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                                                                }}
                                                            >
                                                                {lang}
                                                            </motion.div>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Spice Level Slider */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label
                                            style={{
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            Content Rating
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <input
                                                type="range"
                                                min="1"
                                                max="3"
                                                value={settings.spice}
                                                onChange={(e) => setSettings(prev => ({ ...prev, spice: parseInt(e.target.value) }))}
                                                style={{
                                                    width: '100%',
                                                    accentColor: '#FF1493',
                                                    cursor: 'pointer',
                                                }}
                                            />
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '11px',
                                                color: 'rgba(255, 255, 255, 0.5)',
                                                paddingTop: '4px',
                                            }}>
                                                <span style={{ 
                                                    color: settings.spice === 1 ? '#FF1493' : 'rgba(255, 255, 255, 0.5)',
                                                    fontWeight: settings.spice === 1 ? 'bold' : 'normal',
                                                }}>Flirty</span>
                                                <span style={{ 
                                                    color: settings.spice === 2 ? '#FF1493' : 'rgba(255, 255, 255, 0.5)',
                                                    fontWeight: settings.spice === 2 ? 'bold' : 'normal',
                                                }}>Suggestive</span>
                                                <span style={{ 
                                                    color: settings.spice === 3 ? '#FF1493' : 'rgba(255, 255, 255, 0.5)',
                                                    fontWeight: settings.spice === 3 ? 'bold' : 'normal',
                                                }}>Explicit</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Toggle Grid */}
                            <div>
                                <label 
                                    style={{
                                        display: 'block',
                                        color: '#FFD700',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '12px',
                                    }}
                                >
                                    Content Preferences
                                </label>
                                <div 
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                        gap: '12px',
                                    }}
                                >
                                    {Object.entries(settings.tagToggles).map(([key, value]) => (
                                        <motion.div
                                            key={key}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleToggle(key)}
                                            style={{
                                                padding: '12px',
                                                background: value 
                                                    ? 'rgba(255, 20, 147, 0.15)' 
                                                    : 'rgba(36, 7, 65, 0.7)',
                                                border: value
                                                    ? '2px solid rgba(255, 20, 147, 0.5)'
                                                    : '2px solid rgba(255, 215, 0, 0.3)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '4px',
                                                    background: value ? '#FF1493' : 'rgba(255, 255, 255, 0.1)',
                                                    border: '2px solid ' + (value ? '#FF1493' : 'rgba(255, 215, 0, 0.3)'),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                {value && (
                                                    <motion.span
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        style={{
                                                            color: '#FFFFFF',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                        }}
                                                    >
                                                        ✓
                                                    </motion.span>
                                                )}
                                            </div>
                                            <span
                                                style={{
                                                    color: value ? '#FF1493' : 'rgba(255, 255, 255, 0.7)',
                                                    fontSize: '13px',
                                                    fontWeight: value ? 'bold' : 'normal',
                                                }}
                                            >
                                                {key}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div 
                                style={{
                                    display: 'flex',
                                    gap: '12px',
                                    marginTop: '20px',
                                    justifyContent: 'flex-end',
                                }}
                            >
                                <Button
                                    variant="secondary"
                                    onClick={onCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSave}
                                >
                                    {isNewGame ? 'Start Game' : 'Save Settings'}
                                </Button>
                            </div>
                        </div>
                    </GlassPanel>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
