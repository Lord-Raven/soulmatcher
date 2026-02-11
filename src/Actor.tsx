import { v4 as generateUuid } from 'uuid';
import { EmotionPack } from './Emotion';
import { Stage } from './Stage';

export enum ActorType {
    PLAYER = 'PLAYER',
    HOST = 'HOST',
    CONTESTANT = 'CONTESTANT'
}

export class Actor {
    id: string; // UUID
    type: ActorType = ActorType.CONTESTANT; // Default to CONTESTANT
    name: string = ''; // Display name
    fullPath: string = ''; // Path to original character definition
    avatarImageUrl: string = ''; // Original reference image
    description: string = ''; // Physical description of character
    profile: string = ''; // Personality description of character
    characterArc: string = ''; // Evolving character arc for character
    emotionPack: EmotionPack = {}; // URLs for character's emotion images
    themeColor: string = ''; // Theme color (hex code)
    themeFontFamily: string = ''; // Font family stack for CSS styling
    voiceId: string = ''; // Voice ID

    /**
     * Rehydrate an Actor from saved data
     */
    static fromSave(savedActor: any): Actor {
        const actor = Object.create(Actor.prototype);
        Object.assign(actor, savedActor);
        return actor;
    }

    constructor(props: any) {
        Object.assign(this, props);
        
        this.id = generateUuid();
    }
}

export async function loadReserveActorFromFullPath(fullPath: string, stage: Stage): Promise<Actor|null> {
    const response = await fetch(stage.characterDetailQuery.replace('{fullPath}', fullPath));
    const item = await response.json();
    const dataName = item.node.definition.name.replaceAll('{{char}}', item.node.definition.name).replaceAll('{{user}}', 'Individual X');
    console.log(item);

    const data = {
        name: dataName,
        fullPath: item.node.fullPath,
        personality: item.node.definition.personality.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
        avatar: item.node.max_res_url,
        // If the voice ID is not in the VOICE_MAP, it is a custom voice and should be preserved
        voiceId: !VOICE_MAP[item.node.definition.voice_id] ? item.node.definition.voice_id : ''
    };
    return loadReserveActor(data, stage);
}

// Mapping of voice IDs to a description of the voice, so the AI can choose an ID based on the character profile.
export const VOICE_MAP: {[key: string]: string} = {
    '751212e5-a871-45c7-b10b-6f42a5785954': 'feminine - posh and catty',
    '03a438b7-ebfa-4f72-9061-f086d8f1fca6': 'feminine - calm and soothing', // HQ Female Lowrange
    'a2533977-83cb-4c10-9955-0277e047538f': 'feminine - energetic and lively', // LQ Female Midrange
    '057d53b3-bb28-47f1-9c19-a85a79851863': 'feminine - low and warm', // HQ Female Midrange
    '6e6619ba-4880-4cf3-a5df-d0697ba46656': 'feminine - high and soft', // LQ Female Highrange
    'd6e05564-eea9-4181-aee9-fa0d7315f67d': 'masculine - cool and confident', // HQ Male Lowrange
    'e6b74abb-f4b2-4a84-b9ef-c390512f2f47': 'masculine - posh and articulate', // HQ Male Midrange
    'bright_female_20s': 'feminine - bright and cheerful',
    'resonant_male_40s': 'masculine - resonant and mature',
    'gentle_female_30s': 'feminine - gentle and caring',
    'whispery_female_40s': 'feminine - whispery and mysterious',
    'formal_female_30s': 'feminine - formal and refined',
    'professional_female_30s': 'feminine - professional and direct',
    'calm_female_20s': 'feminine - calm and soothing',
    'light_male_20s': 'masculine - light and thoughtful',
    'animated_male_20s': 'masculine - hip and lively',
};

export async function loadReserveActor(data: any, stage: Stage): Promise<Actor|null> {
    console.log('Loading reserve actor:', data.name);
    console.log(data);

    // Attempt to substitute words to avert bad content into something more agreeable (if the distillation still has these, then drop the card).
    const bannedWordSubstitutes: {[key: string]: string} = {
        // Try to age up some terms in the hopes that the character can be salvaged.
        'underage': 'young adult',
        'adolescent': 'young adult',
        'youngster': 'young adult',
        'teen': 'young adult',
        'highschooler': 'young adult',
        'childhood': 'formative years',
        // Don't bother with these; just set it to the same word so it gets discarded.
        'child': 'child',
        'toddler': 'toddler',
        'infant': 'infant',
        // Assume that these words are being used in an innocuous way, unless they come back in the distillation.
        'kid': 'joke',
        'baby': 'honey',
        'minor': 'trivial',
        'old-school': 'retro',
        'high school': 'college',
        'school': 'college'};


    // Preserve content while removing JSON-like structures.
    data.name = data.name.replace(/{/g, '(').replace(/}/g, ')');
    data.personality = data.personality.replace(/{/g, '(').replace(/}/g, ')');

    // Apply banned word substitutions:
    for (const [bannedWord, substitute] of Object.entries(bannedWordSubstitutes)) {
        // Need to do a case-insensitive replacement for each occurrence:
        const regex = new RegExp(bannedWord, 'gi');
        data.name = data.name.replace(regex, substitute);
        data.personality = data.personality.replace(regex, substitute);
    }

    if (Object.keys(bannedWordSubstitutes).some(word => data.personality.toLowerCase().includes(word) || data.name.toLowerCase().includes(word))) {
        console.log(`Immediately discarding actor due to banned words: ${data.name}`);
        return null;
    } else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(`${data.name}${data.personality}`)) {
        console.log(`Immediately discarding actor due to non-english characters: ${data.name}`);
        return null;
    }

    // Fetch the avatar image to inspect properties; if it's too small, discard this actor.
    try {
        if (data.avatar) {
            const imgResponse = await fetch(data.avatar);
            const imgBlob = await imgResponse.blob();
            const imgBitmap = await createImageBitmap(imgBlob);
            if (imgBitmap.width < 400 || imgBitmap.height < 400) {
                console.log(`Discarding actor due to small avatar image: ${data.name} (${imgBitmap.width}x${imgBitmap.height})`);
                return null;
            } else if (imgBitmap.width / imgBitmap.height < 0.3 || imgBitmap.width / imgBitmap.height > 1.2) {
                console.log(`Discarding actor due to extreme avatar aspect ratio: ${data.name} (${imgBitmap.width}x${imgBitmap.height})`);
                return null;
            }
        }
    } catch (error) {
        // Failed to fetch avatar image.
        console.log(`Discarding actor due to failed avatar image fetch: ${data.name}`);
        return null;
    }

    // Take this data and use text generation to get an updated distillation of this character, including a physical description.
    const generatedResponse = await stage.generator.textGen({
        prompt: `{{messages}}This is preparatory request for structured and formatted game content.` +
            `\n\nBackground: This game is a futuristic multiverse setting that pulls characters from across eras and timelines and settings. ` +
            `The player of this game, ${stage.getPlayerActor()?.name || 'Player'}, manages a space station called the Post-Apocalypse Rehabilitation Center, or PARC, which resurrects victims of a multiversal calamity and helps them adapt to a new life, ` +
            `with the goal of placing these characters into a new role in this universe. These new roles are offered by external factions, generally in exchange for a finder's fee or reputation boost. ` +
            `Some roles are above board, while others may involve morally ambiguous or covert activities; some may even be illicit or compulsary. ` +
            `The player's motives and ethics are open-ended; they may be benevolent or self-serving, and the characters they interact with may respond accordingly. ` +
            `\n\nThe Original Details below describe a character or scenario (${data.name}) from another universe. This request and response must digest and distill these details to suit the game's narrative scenario, ` +
            `crafting a character who has been rematerialized into this universe through an "echo chamber," their essence reconstituted from the whispers of a black hole. ` +
            `As a result of this process, many of this character's traits may have changed, including the loss of most supernatural or arcane abilities, which functioned only within the rules of their former universe. ` +
            `Their new description and profile should reflect these possible changes and their impact.\n\n` +
            `The provided Original Details reference 'Individual X' who no longer exists in this timeline; ` +
            `if Individual X remains relevant to this character, Individual X should be replaced with an appropriate name in the distillation.\n\n` +
            `In addition to the simple display name, physical description, and personality profile, ` +
            `score the character on a scale of 1-10 for the following traits: BRAWN, SKILL, NERVE, WITS, CHARM, LUST, JOY, and TRUST.\n` +
            `Bear in mind the character's current, diminished state—as a newly reconstituted and relatively powerless individual—and not their original potential when scoring these traits (but omit your reasons from the response structure); ` +
            `some characters may not respond well to being essentially resurrected into a new timeline, losing much of what they once had. Others may be grateful for a new beginning.\n\n` +
            `Original Details about ${data.name}:\n ${data.personality}\n\n` +
            `Available Voices:\n` +
            Object.entries(VOICE_MAP).map(([voiceId, voiceDesc]) => '  - ' + voiceId + ': ' + voiceDesc).join('\n') +
            `Instructions: After carefully considering this description and the rules provided, generate a concise breakdown for a character based upon these details in the following strict format:\n` +
            `System: NAME: Their simple name\n` +
            `DESCRIPTION: A vivid description of the character's physical appearance, attire, and any distinguishing features.\n` +
            `PROFILE: A brief summary of the character's key personality traits and behaviors.\n` +
            `STYLE: A concise description of the character's sense of overall style, mood, interests, or aesthetic, to be applied to the way they decorate their space.\n` +
            `VOICE: Output the specific voice ID from the Available Voices section that best matches the character's apparent gender (foremost) and personality.\n` +
            `COLOR: A hex color that reflects the character's theme or mood—use darker or richer colors that will contrast with white text.\n` +
            `FONT: A font stack, or font family that reflects the character's personality; this will be embedded in a CSS font-family property.\n` +
            `#END#\n\n` +
            `Example Response:\n` +
            `NAME: Jane Doe\n` +
            `DESCRIPTION: A tall, athletic woman with short, dark hair and piercing blue eyes. She wears a simple, utilitarian outfit made from durable materials.\n` +
            `PROFILE: Jane is confident and determined, with a strong sense of justice. She is quick to anger but also quick to forgive. She is fiercely independent and will do whatever it takes to protect those she cares about.\n` +
            `STYLE: Practical and no-nonsense, favoring functionality over fashion. Prefers muted colors and simple designs that allow freedom and comfort.\n` +
            `VOICE: 03a438b7-ebfa-4f72-9061-f086d8f1fca6\n` +
            `COLOR: #333333\n` +
            `FONT: Calibri, sans-serif\n` +
            `#END#`,
        stop: ['#END'],
        include_history: true, // There won't be any history, but if this is true, the front-end doesn't automatically apply pre-/post-history prompts.
        max_tokens: 400,
    });
    console.log('Generated character distillation:');
    console.log(generatedResponse);
    // Parse the generated response into components:
    const lines = generatedResponse?.result.split('\n').map((line: string) => line.trim()) || [];
    const parsedData: any = {};
    // data could be erroneously formatted (for instance, "1. Name:" or "-Description:"), so be resilient:
    for (let line of lines) {
        // strip ** from line:
        line = line.replace(/\*\*/g, '');
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            // Find last word before : and use that as the key. Ignore 1., -, *. There might not be a space before the word:
            const keyMatch = line.substring(0, colonIndex).trim().match(/(\w+)$/);
            if (!keyMatch) continue;
            const key = keyMatch[1].toLowerCase();
            const value = line.substring(colonIndex + 1).trim();
            // console.log(`Parsed line - Key: ${key}, Value: ${value}`);
            parsedData[key] = value;
        }
    }

    // Validate that parsedData['color'] is a valid hex color, otherwise assign a random default:
    const themeColor = /^#([0-9A-F]{6}|[0-9A-F]{8})$/i.test(parsedData['color']) ?
            parsedData['color'] :
            ['#788ebdff', '#d3aa68ff', '#75c275ff', '#c28891ff', '#55bbb2ff'][Math.floor(Math.random() * 5)];
    const newActor = new Actor({
        // Replace name quotation marks with single-quotes to avoid issues where nicknames are highlighted as dialogue:
        name: (parsedData['name'] || data.name).replace(/["“”]/g, "'"),
        fullPath: data.fullPath || '',
        avatar: data.avatar || '',
        description: parsedData['description'] || '',
        profile: parsedData['profile'] || '',
        style: parsedData['style'] || '',
        voiceId: data.voiceId || parsedData['voice'] || '',
        themeColor: themeColor,
        font: parsedData['font'] || 'Arial, sans-serif',
        
    });
    console.log(`Loaded new actor: ${newActor.name} (ID: ${newActor.id})`);
    console.log(newActor);
    // If name, description, or profile are missing, or banned words are present or the attributes are all defaults (unlikely to have been set at all) or description is non-english, discard this actor by returning null
    // Rewrite discard reasons to log which reason applied:
    if (!newActor.name) {
        console.log(`Discarding actor due to missing name: ${newActor.name}`);
        return null;
    } else if (!newActor.description) {
        console.log(`Discarding actor due to missing description: ${newActor.name}`);
        return null;
    } else if (!newActor.profile) {
        console.log(`Discarding actor due to missing profile: ${newActor.name}`);
        return null;
    } else if (Object.keys(bannedWordSubstitutes).some(word => newActor.description.toLowerCase().includes(word))) {
        console.log(`Discarding actor due to banned words in description: ${newActor.name}`);
        return null;
    } else if (newActor.name.length <= 2 || newActor.name.length >= 30) {
        console.log(`Discarding actor due to extreme name length: ${newActor.name}`);
        return null;
    } else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(`${newActor.name}${newActor.description}${newActor.profile}`)) {
        console.log(`Discarding actor due to non-english characters in name/description/profile: ${newActor.name}`);
        return null;
    }

    return newActor;
}