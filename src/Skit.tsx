import { Emotion } from "./Emotion";

export enum SkitType {
    INTRO = 'INTRO',
    ROUND_ONE = 'ROUND_ONE',
    ROUND_TWO = 'ROUND_TWO',
    REVEAL = 'REVEAL',
    OUTRO = 'OUTRO',
}

export class Skit {
    skitType: SkitType = SkitType.INTRO;
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
    
    constructor(props: any) {
        Object.assign(this, props);
    }
}