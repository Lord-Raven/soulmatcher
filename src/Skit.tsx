import { Actor, findBestNameMatch } from "./Actor";
import { Emotion, EMOTION_MAPPING } from "./Emotion";
import { Stage } from "./Stage";

export enum SkitType {
    GAME_INTRO = 'GAME_INTRO',
    CONTESTANT_INTRO = 'CONTESTANT_INTRO',
    GROUP_INTERVIEW = 'GROUP_INTERVIEW',
    FINALIST_ONE_ON_ONE = 'FINALIST_ONE_ON_ONE',
    RESULTS = 'RESULTS',
}

export class Skit {
    skitType: SkitType = SkitType.GAME_INTRO;
    script: ScriptEntry[] = [];
    presentActors: string[] = []; // List of Actor IDs present in this skit
    locationDescription: string = '';
    locationImageUrl: string = '';
    
    constructor(props: any) {
        Object.assign(this, props);
    }
}

export class ScriptEntry {
    speakerId: string = ''; // Actor ID of speaker
    message: string = ''; // Message content for this script entry
    speechUrl: string = ''; // Optional URL for text-to-speech audio
    actorEmotions: {[key: string]: Emotion} = {}; // Map of emotion changes by actor ID
    endScene?: boolean = false; // Optional flag to indicate if this entry ends the scene
    
    constructor(props: any) {
        Object.assign(this, props);
    }
}

function buildScriptLog(stage: Stage, skit: Skit, additionalEntries: ScriptEntry[] = []): string {
        return ((skit.script && skit.script.length > 0) || additionalEntries.length > 0) ?
            [...skit.script, ...additionalEntries].map(e => {
                // Find the best matching emotion key for this speaker
                const emotionKeys = Object.keys(e.actorEmotions || {});
                const speaker = stage.saveData.actors[e.speakerId]?.name || e.speakerId;
                const candidates = emotionKeys.map(key => ({ name: key }));
                const bestMatch = findBestNameMatch(speaker, candidates);
                const matchingKey = bestMatch?.name;
                const emotionText = matchingKey ? ` [${matchingKey} EXPRESSES ${e.actorEmotions?.[matchingKey]}]` : '';
                return `${speaker}:${e.message}${emotionText}`;
            }).join('\n')
            : '(None so far)';
}

export function generateSkitPrompt(skit: Skit, stage: Stage, historyLength: number, instruction: string): string {
    const player = stage.getPlayerActor();
    const host = stage.getHostActor();
    const save = stage.saveData;

    // Determine present and absent actors for this moment in the skit (as of the last entry in skit.script):
    const presentActorIds = skit.presentActors;
    const presentActors = Object.values(save.actors).filter(a => presentActorIds.includes(a.id));
    const absentActors = Object.values(save.actors).filter(a => !presentActorIds.includes(a.id));


    let pastSkits = save.skits || [];
    pastSkits = pastSkits.filter((v, index) => index > (pastSkits.length || 0) - historyLength && v != skit);

    let fullPrompt = `{{messages}}\nPremise:\nThis is an interactive visual novel depicting a modern dating gameshow hosted by the actual Roman god of love, Cupid.` +
        `The game positions the player character, ${player.name}, as the primary contestant interviewing a number of candidate love interests. After a couple rounds of interviews, ${player.name}, the audience, and Cupid himself will ` +
        `vote on the candidate they think should become ${player.name}'s soulmate, and then Cupid will shoot them both and seal the deal.` +
        `\n\n${player.name}'s profile: ${player.description}` +
        `\n\nCupid's profile: ${host.description}` +
        
        `\n\nScene Prompt:\n  [Need a prompt based on the current skit type]` +
        
        ((historyLength > 0 && pastSkits.length) ? 
                // Include last few skit scripts for context and style reference
                '\n\nRecent Events for additional context:' + pastSkits.map((v, index) =>  {
                if (v && v.script && v.script.length > 0) {
                    return `\n\n  Script of previous skit:\n${buildScriptLog(stage, v)}`;
                }
            }).join('') : '') +

        // List characters who are here, along with full stat details:
        `\n\nParticipating Candidates:\n${presentActors.filter(actor => actor != stage.getPlayerActor() && actor != stage.getHostActor()).map(actor => {
            return `  ${actor.name}\n    Description: ${actor.description}\n    Profile: ${actor.profile}\n`}).join('\n')}` +
        `\n\nOther Candidates:\n${absentActors.filter(actor => actor != stage.getPlayerActor() && actor != stage.getHostActor()).map(actor => {
            return `  ${actor.name}\n    Description: ${actor.description}\n    Profile: ${actor.profile}\n`}).join('\n')}` +
        `\n\n${instruction}`;
    return fullPrompt;
}


export async function generateSkitScript(skit: Skit, stage: Stage): Promise<{ entries: ScriptEntry[]; endScene: boolean}> {

    // Retry logic if response is null or response.result is empty
    let retries = 3;
    while (retries > 0) {
        try {
            const fullPrompt = generateSkitPrompt(skit, stage, 5 + retries * 5, // Start with lots of history, reducing each iteration.
                `Example Script Format:\n` +
                    `CHARACTER NAME: Character Name does some actions in prose; for example, they may be waving to you, the player. They say, "My dialogue is in quotation marks."\n` +
                    `CHARACTER NAME: [CHARACTER NAME EXPRESSES PRIDE] "A character can have two entries in a row, if they have more to say or do or it makes sense to break up a lot of activity."\n` +
                    `ANOTHER CHARACTER NAME: [ANOTHER CHARACTER NAME EXPRESSES JOY][CHARACTER NAME EXPRESSES SURPRISE] ` +
                        `"Other character expressions can update in each other's entries—say, if they're reacting to something the speaker says—, but only the named character can speak in each entry."\n` +
                    `CHARACTER NAME: They nod in agreement, "If there's any dialogue at all, the entry must be attributed to the character speaking."\n` +
                    `NARRATOR: [CHARACTER NAME EXPRESSES RELIEF] Descriptive content or other scene events occurring around you, the player, can be attributed to NARRATOR. Dialogue cannot be included in NARRATOR entries.\n` +
                    `${stage.getPlayerActor().name.toUpperCase()}: "Hey, Character Name," I greet them warmly. I'm the player, and my entries use first-person narrative voice, while all other skit entries use second-person to refer to me.\n` +
                    `\n\n` +
                (skit.script.length > 0 ? (`Example Summary Script Format:\n` +
                    `CHARACTER NAME: [CHARACTER NAME EXPRESSES OPTIMISM] Character Name smiles at you. "I think we made real progress here today. Thanks!"\n` +
                    `NARRATOR: There's a moment of real connection between the both of you. Something the PARC could use more of.\n` +
                    `[SUMMARY: This moment of shared commaraderie has left Character Name hopeful about their future aboard the PARC.]\n\n`) : '') +
                `Current Scene Script Log to Continue:\n${buildScriptLog(stage, skit)}` +
                `\n\nPrimary Instruction:\n` +
                `  ${skit.script.length == 0 ? 'Produce the initial moments of a scene (perhaps joined in medias res)' : 'Extend or conclude the current scene script'} with three to five entries, ` +
                `based upon the Premise and the specified Scene Prompt. Primarily involve the Present Characters, although Absent Characters may be moved to this location using appropriate tags. ` +
                `The script should consider characters' stats, relationships, past events, and the station's stats—among other factors—to craft a compelling scene. ` +
                `\n\n  Follow the structure of the strict Example Script formatting above: ` +
                `actions are depicted in prose and character dialogue in quotation marks. Characters present their own actions and dialogue, while other events within the scene are attributed to NARRATOR. ` +
                `Although a loose script format is employed, the actual content should be professionally edited narrative prose. ` +
                `Entries from the player, ${stage.getPlayerActor().name}, are written in first-person, while other entries consistently refer to ${stage.getPlayerActor().name} in second-person; all other characters are referred to in third-person, even in their own entries.` +
                `\n\nTag Instruction:\n` +
                `  Embedded within this script, you may employ special tags to trigger various game mechanics. ` +
                `\n\n  Emotion tags ("[CHARACTER NAME EXPRESSES JOY]") should be used to indicate visible emotional shifts in a character's appearance using a single-word emotion name. ` +
                (skit.script.length > 0 ? (`If a scene transition is desired, the current scene must first be summarized. ` +
                    `\n\n  A "[SUMMARY]" tag (e.g., "[SUMMARY: A paragraph summarizing the scene's events with key details and impacts.]") should be included when the scene reaches a conclusive moment. `) : '') +
                `\n\nThis scene is a brief visual novel skit within a video game; as such, the scene avoids major developments which would fundamentally alter the mechanics or nature of the game, ` +
                `instead developing content within the existing rules. ` +
                `As a result, avoid timelines or concrete, countable values throughout the skit, using vague durations or amounts for upcoming events; the game's mechanics may by unable to map directly to what is depicted in the skit, so ambiguity is preferred. ` +
                `Generally, focus upon interpersonal dynamics, character growth, faction and patient relationships, and the state of the Station, its capabilities, and its inhabitants.` +
                (skit.script.length > 0 ? (`\nIf the script reaches a conclusion, depicts a scene change, or hits an implied closure, ` +
                `remember to insert a "[SUMMARY: A paragraph summarizing this scene's key events or impacts.]" tag, so the game engine can store the summary.`) : '') +
                ((stage.saveData.language || 'English').toLowerCase() !== 'english' ? `\n\nNote: The game is now being played in ${stage.saveData.language}. Regardless of historic language use, generate this skit content in ${stage.saveData.language} accordingly. Special emotion and movement tags continue to use English (these are invisible to the user).` : '')
            );

            const response = await stage.generator.textGen({
                prompt: fullPrompt,
                min_tokens: 10,
                max_tokens: 500,
                include_history: true,
                stop: []
            });
            if (response && response.result && response.result.trim().length > 0) {
                // First, detect and parse any tags that may be embedded in the response.
                let text = response.result;
                let endScene = false;
                let summary = undefined;

                // Strip double-asterisks. TODO: Remove this once other model issue is resolved.
                text = text.replace(/\*\*/g, '');

                // Remove any initial "System:" prefix
                if (text.toLowerCase().startsWith('system:')) {
                    text = text.slice(7).trim();
                }

                // Parse response based on format "NAME: content"; content could be multi-line. We want to ensure that lines that don't start with a name are appended to the previous line.
                const lines = text.split('\n');
                const combinedLines: string[] = [];
                const combinedEmotionTags: {emotions: {[key: string]: Emotion}, movements: {[actorId: string]: string}}[] = [];
                let currentLine = '';
                let currentEmotionTags: {[key: string]: Emotion} = {};
                let currentMovements: {[actorId: string]: string} = {};
                for (const line of lines) {
                    // Skip empty lines
                    let trimmed = line.trim();

                    // First, look for an ending tag.
                    if (trimmed.startsWith('[SUMMARY')) {
                        console.log("Detected end scene tag.");
                        endScene = true;
                        const summaryMatch = /\[SUMMARY:\s*([^\]]+)\]/i.exec(trimmed);
                        summary = summaryMatch ? summaryMatch[1].trim() : undefined;
                        continue;
                    }

                    // If a line doesn't end with ], ., !, ?, or ", then it's likely incomplete and we should drop it.
                    if (!trimmed || ![']', '*', '_', ')', '.', '!', '?', '"', '\''].some(end => trimmed.endsWith(end))) continue;

                    const newEmotionTags: {[key: string]: Emotion} = {};
                    const newMovements: {[actorId: string]: string} = {};

                    // Prepare list of all actors (not just present)
                    const allActors: Actor[] = Object.values(stage.saveData.actors);
                    
                    // Process tags in the line
                    for (const tag of trimmed.match(/\[[^\]]+\]/g) || []) {
                        const raw = tag.slice(1, -1).trim();
                        if (!raw) continue;

                        console.log(`Processing tag: ${raw}`);
                        
                        // Look for expresses tags:
                        const emotionTagRegex = /([^[\]]+)\s+EXPRESSES\s+([^[\]]+)/gi;
                        let emotionMatch = emotionTagRegex.exec(raw);
                        if (emotionMatch) {
                            const characterName = emotionMatch[1].trim();
                            const emotionName = emotionMatch[2].trim().toLowerCase();
                            // Find matching actor using findBestNameMatch
                            const matched = findBestNameMatch(characterName, allActors);
                            if (!matched) continue;
                            
                            // Try to map emotion using EMOTION_SYNONYMS if not a standard emotion
                            let finalEmotion: Emotion | undefined;
                            if (emotionName in Emotion) {
                                finalEmotion = emotionName as Emotion;
                                console.log(`Recognized standard emotion "${finalEmotion}" for ${matched.name}`);
                            } else if (emotionName in EMOTION_MAPPING) {
                                finalEmotion = EMOTION_MAPPING[emotionName];
                                console.log(`Mapped non-standard emotion "${emotionName}" to "${finalEmotion}" for ${matched.name}`);
                            } else {
                                console.warn(`Unrecognized emotion "${emotionName}" for ${matched.name}; skipping tag.`);
                            }
                            
                            if (!finalEmotion) continue;
                            newEmotionTags[matched.name] = finalEmotion;
                        }
                    }

                    // Remove all tags:
                    trimmed = trimmed.replace(/\[([^\]]+)\]/g, '').trim();

                    if (line.includes(':')) {
                        // New line
                        if (currentLine) {
                            combinedLines.push(currentLine.trim());
                            combinedEmotionTags.push({
                                emotions: currentEmotionTags,
                                movements: currentMovements
                            });
                        }
                        currentLine = trimmed;
                        currentEmotionTags = newEmotionTags;
                        currentMovements = newMovements;
                    } else {
                        // Continuation of previous line
                        currentLine += '\n' + trimmed;
                        currentEmotionTags = {...currentEmotionTags, ...newEmotionTags};
                        currentMovements = {...currentMovements, ...newMovements};
                    }
                }
                if (currentLine) {
                    combinedLines.push(currentLine.trim());
                    combinedEmotionTags.push({
                        emotions: currentEmotionTags,
                        movements: currentMovements
                    });
                }

                // Convert combined lines into ScriptEntry objects by splitting at first ':'
                const scriptEntries: ScriptEntry[] = combinedLines.map((l, index) => {
                    const idx = l.indexOf(':');
                    let speakerName = 'NARRATOR';
                    let message = l;
                    
                    if (idx !== -1) {
                        speakerName = l.slice(0, idx).trim();
                        message = l.slice(idx + 1).trim();
                    }

                    const speaker = findBestNameMatch(speakerName, Object.values(stage.saveData.actors)) || null;
                    
                    // Remove any remaining tags
                    message = message.replace(/\[([^\]]+)\]/g, '').trim();
                    
                    const tagData = combinedEmotionTags[index];
                    const entry: ScriptEntry = { speakerId: speaker?.id || '', message, speechUrl: '', actorEmotions: tagData.emotions  };
                    
                    return entry;
                });

                // Drop empty entries from scriptEntries and adjust speaker to any matching actor's name:
                for (const entry of scriptEntries) {
                    if (!entry.message || entry.message.trim().length === 0) {
                        scriptEntries.splice(scriptEntries.indexOf(entry), 1);
                        continue;
                    }
                }

                // TTS for each entry's dialogue
                const ttsPromises = scriptEntries.map(async (entry) => {
                    const actor = stage.saveData.actors[entry.speakerId] || null;
                    // Only TTS if entry.speaker matches an actor from stage().getSave().actors and entry.message includes dialogue in quotes.
                    if (!actor || !entry.message.includes('"') || stage.saveData.disableTextToSpeech) {
                        entry.speechUrl = '';
                        return;
                    }
                    let transcript = entry.message.split('"').filter((_, i) => i % 2 === 1).join('.........').trim();
                    // Strip asterisks or other markdown-like emphasis characters
                    transcript = transcript.replace(/[\*_~`]+/g, '');
                    try {
                        const ttsResponse = await stage.generator.speak({
                            transcript: transcript,
                            voice_id: actor.voiceId ?? undefined
                        });
                        if (ttsResponse && ttsResponse.url) {
                            entry.speechUrl = ttsResponse.url;
                        } else {
                            entry.speechUrl = '';
                        }
                    } catch (err) {
                        console.error('Error generating TTS:', err);
                        entry.speechUrl = '';
                    }
                });

                // Wait for all TTS generation to complete
                await Promise.all(ttsPromises);

                // Attach endScene and endProperties to the final entry if the scene ended
                if (endScene && scriptEntries.length > 0) {
                    const finalEntry = scriptEntries[scriptEntries.length - 1];
                    finalEntry.endScene = true;
                }

                return { entries: scriptEntries, endScene: endScene };
            }
        } catch (error) {
            console.error('Error generating skit script:', error);
        }
        retries--;
    }
    return { entries: [], endScene: false };
}