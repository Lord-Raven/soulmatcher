import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message, Character, User} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import { Actor, loadReserveActorFromFullPath } from "./Actor";
import { generateSkitScript, Skit, SkitType } from "./Skit";
import { BaseScreen } from "./Screens/BaseScreen";

type MessageStateType = any;
type ConfigType = any;
type InitStateType = any;

export enum GamePhase {
    GAME_INTRO = 'GAME_INTRO',                           // Introduction to the game
    CONTESTANT_INTRO = 'CONTESTANT_INTRO',               // Introducing contestants one at a time
    GROUP_INTERVIEW = 'GROUP_INTERVIEW',                 // Group contestant interview
    FINALIST_SELECTION = 'FINALIST_SELECTION',           // Player chooses three finalists
    LOSER_INTERVIEW = 'LOSER_INTERVIEW',                 // Losers offer their parting words
    FINALIST_ONE_ON_ONE = 'FINALIST_ONE_ON_ONE',         // One-on-one skits with finalists
    FINAL_VOTING = 'FINAL_VOTING',                       // Player, host, and audience vote
    GAME_COMPLETE = 'GAME_COMPLETE',                     // Game finished
    EPILOGUE = 'EPILOGUE'                                // Unending slice-of-life epilogue with winner
}

export type GameProgressState = {
    currentPhase: GamePhase;
    contestantsIntroduced: string[];      // Array of Actor IDs that have been introduced
    finalistIds: string[];                // Array of Actor IDs chosen as finalists
    losersInterviewed: string[];          // Array of loser contestant IDs that have had goodbye skits
    finalistsInterviewed: string[];       // Array of finalist Actor IDs that have had one-on-ones
    playerChoice: string | null;          // Actor ID of player's final choice
    hostChoice: string | null;            // Actor ID of host's choice
    audienceChoice: string | null;        // Actor ID of audience's choice
    winnerId: string | null;              // Actor ID of the winner
    currentSkitId: string | null;         // ID of the current skit being displayed
    skitOrder: string[];                  // Ordered list of skit IDs for history tracking
}



type ChatStateType = {
    actors: {[key: string]: Actor};
    skits: {[key: string]: Skit};         // Map of skit ID to Skit
    disableTextToSpeech: boolean;
    language: string;
    bannedTags: string[];
    spice?: number;  // 1-3 scale for content rating (1=flirty, 2=dirty, 3=explicit)
    gameProgress: GameProgressState;
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    readonly FETCH_AT_TIME = 20;
    readonly MAX_PAGES = 30;
    readonly bannedTagsDefault = [
        'FUZZ',
        'child',
        'teenager',
        'narrator',
        'underage',
        'multi-character',
        'multiple characters',
        'nonenglish',
        'non-english',
        'famous people',
        'celebrity',
        'real person',
        'feral'
    ];
    // At least one of these is required for a faction search; helps indicate that the card has a focus on setting or tone.
    readonly characterSearchQuery = `https://inference.chub.ai/search?first=${this.FETCH_AT_TIME}&exclude_tags={{EXCLUSIONS}}&&page={{PAGE_NUMBER}}&tags={{SEARCH_TAGS}}&sort=random&asc=false&include_forks=false&nsfw=true&nsfl=false` +
        `&nsfw_only=false&require_images=false&require_example_dialogues=false&require_alternate_greetings=false&require_custom_prompt=false&exclude_mine=false&min_tokens=200&max_tokens=5000` +
        `&require_expressions=true&require_lore=false&mine_first=false&require_lore_embedded=false&require_lore_linked=false&my_favorites=false&inclusive_or=true&recommended_verified=false&count=false&min_tags=3`;
    readonly characterDetailQuery = 'https://inference.chub.ai/api/characters/{fullPath}?full=true';
    private actorPageNumber = Math.floor(Math.random() * this.MAX_PAGES);
    readonly CONTESTANT_COUNT = 5;
    loadPromises: Promise<void>[] = [];

    saveData: ChatStateType;
    primaryUser: User
    primaryCharacter: Character;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        const {
            users,
            characters,
            chatState
        } = data;

        this.primaryUser = Object.values(users)[0];
        this.primaryCharacter = Object.values(characters)[0];

        if (chatState) {
            this.saveData = chatState;
            // Ensure gameProgress exists for older saves
            if (!this.saveData.gameProgress) {
                this.saveData.gameProgress = this.createInitialGameProgress();
            }
        } else {
            this.saveData = {
                actors: {},
                skits: {},
                disableTextToSpeech: false,
                language: 'English',
                bannedTags: [],
                gameProgress: this.createInitialGameProgress(),
            };
        }
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        return {
            success: true,
            error: null,
            initState: null,
            chatState: this.saveData,
        };
    }

    // Unused functions required by the interface.
    async setState(state: MessageStateType): Promise<void> {}
    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {return {}};
    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {return {}};

    pushMessage(message: string) {
        //if (this.isAuthenticated) {
            this.messenger.impersonate({
                speaker_id: this.primaryCharacter.anonymizedId,
                is_main: false,
                parent_id: null,
                message: message
            });
        //}
    }

    // This is called when the user starts a new game; some props supplied by initial settings screen.
    async startNewGame(playerDetails: Partial<Actor>): Promise<void> {
        // Initialize everything.
        this.saveData.skits = {};
        this.saveData.actors = {};
        this.saveData.gameProgress = this.createInitialGameProgress();
        // Player actor:
        const playerActor = new Actor({
            ...playerDetails,
            type: 'PLAYER',
            name: playerDetails.name || 'Player',
        });
        this.saveData.actors[playerActor.id] = playerActor;

        // Host actor:
        const hostActor = new Actor({
            type: 'HOST',
            name: 'Cupid', // this.primaryCharacter.name || 'Host',
            description: `The athletic-yet-spritely Roman god of love, Cupid. He wears a classic toga, carries a microphone, and exudes charm and charisma. He flits upon angelic wings or lounges in ridiculously languid poses—never simply standing.`, // this.primaryCharacter.description || '',
            profile: `The Roman god of love, mischief, and matchmaking. He delights in orchestrating romantic encounters and spreading affection among mortals. The quick-talking Cupid somehow manages to be bratty-yet-suave in a frustratingly charming way. Today, he's hosting reality television, tomorrow? Maybe he'll start a war.`, // this.primaryCharacter.personality || '',
            motive: `To create the most entertaining and heartwarming dating show in history, while subtly puppeteering events to his amusement. Cupid secretly dislikes much of the show's branding, including the mixed-case title, "SoulMatcher," and the golden "baby Cupid" silhouettes (imagery that has long been a thorn in his side).`, // this.primaryCharacter.motive || '',
            themeColor: '#FF69B4',
            themeFontFamily: 'Arial, sans-serif',
            voiceId: 'light_male_20s',
            emotionPack: this.primaryCharacter.partial_extensions?.chub?.expressions?.expressions
        });

        console.log('Host actor emotion pack:');
        console.log(hostActor.emotionPack);
        console.log(this.primaryCharacter.partial_extensions);

        this.saveData.actors[hostActor.id] = hostActor;

        // Contestants - load asynchronously:
        console.log('Starting contestant loading...');
        // Clear any existing load promises
        this.loadPromises = [];
        
        // Create the asynchronous contestant loading promise
        const contestantLoadPromise = (async () => {
            let reserveActors: Actor[] = [];
            while (reserveActors.length < this.CONTESTANT_COUNT) {
                // Populate reserveActors; this is loaded with data from a service, calling the characterServiceQuery URL:
                const exclusions = (this.saveData.bannedTags || []).concat(this.bannedTagsDefault).map(tag => encodeURIComponent(tag)).join('%2C');
                const response = await fetch(this.characterSearchQuery
                    .replace('{{PAGE_NUMBER}}', this.actorPageNumber.toString())
                    .replace('{{EXCLUSIONS}}', exclusions ? exclusions + '%2C' : '')
                    .replace('{{SEARCH_TAGS}}', /*this.actorTags.concat(this.actorTags)*/[].join('%2C')));
                const searchResults = await response.json();
                console.log(searchResults);
                // Need to do a secondary lookup for each character in searchResults, to get the details we actually care about:
                const basicCharacterData = searchResults.data?.nodes.filter((item: string, index: number) => index < this.CONTESTANT_COUNT - reserveActors.length).map((item: any) => item.fullPath) || [];
                if (basicCharacterData.length === 0) {
                    console.log('No more characters found in search results; resetting to first page.');
                    this.actorPageNumber = 0; // reset to first page if we run out of results
                } else {
                    this.actorPageNumber = (this.actorPageNumber % this.MAX_PAGES) + 1;
                }
                console.log(basicCharacterData);

                const newActors: Actor[] = await Promise.all(basicCharacterData.map(async (fullPath: string) => {
                    return loadReserveActorFromFullPath(fullPath, this);
                }));

                reserveActors = [...reserveActors, ...newActors.filter(a => a !== null)];
                if (reserveActors.length < this.CONTESTANT_COUNT) {
                    console.log(`Only found ${reserveActors.length} valid contestants so far; continuing search...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.log(`Found ${reserveActors.length} valid contestants!`);
                    console.log(reserveActors);
                }
            }
            reserveActors.forEach(actor => this.saveData.actors[actor.id] = actor);
            console.log('Contestant loading complete!');
        })().finally(() => {
            // Remove this promise from the array when complete
            const index = this.loadPromises.indexOf(contestantLoadPromise);
            if (index > -1) {
                this.loadPromises.splice(index, 1);
            }
        });
        
        // Add the promise to the array for tracking
        this.loadPromises.push(contestantLoadPromise);
        
        // Create the initial GAME_INTRO skit and generate its script as part of the startup
        const gameIntroPromise = (async () => {
            const studioDescription = "The studio is a vibrant and dynamic space, designed to evoke the excitement and glamour of a high-stakes dating gameshow. The stage is set with bright, colorful lights that create an energetic atmosphere, while large LED screens display dynamic backgrounds that change with each skit. The audience area is filled with enthusiastic spectators, their cheers and reactions adding to the lively ambiance. The contestant's podium is sleek and modern, equipped with interactive elements that allow the player to make choices that influence the flow of the game. Overall, the studio is a visually stimulating environment that immerses the player in the thrilling world of SoulMatcher.";
            
            // Create the intro skit with empty script
            const introSkit = new Skit({
                skitType: SkitType.GAME_INTRO,
                script: [],
                presentActors: [hostActor.id],
                locationDescription: studioDescription,
                locationImageUrl: ''
            });
            
            // Generate the initial script
            const scriptResult = await generateSkitScript(introSkit, this);
            introSkit.script = scriptResult.entries;
            
            // Add to skits map and save
            this.addSkit(introSkit);
            this.saveGame();
            console.log('Game intro skit generated and ready!');
        })().finally(() => {
            // Remove this promise from the array when complete
            const index = this.loadPromises.indexOf(gameIntroPromise);
            if (index > -1) {
                this.loadPromises.splice(index, 1);
            }
        });
        
        this.loadPromises.push(gameIntroPromise);
        // Don't await - let it run in the background
    }

    saveGame() {
        this.messenger.updateChatState(this.saveData);
    }

    getPlayerActor(): Actor {
        return Object.values(this.saveData.actors).find(actor => actor.type === 'PLAYER')!;
    }

    getHostActor(): Actor {
        return Object.values(this.saveData.actors).find(actor => actor.type === 'HOST')!;
    }

    getContestantActors(): Actor[] {
        return Object.values(this.saveData.actors).filter(actor => actor.type === 'CONTESTANT');
    }

    getCurrentSkit(): Skit | null {
        const currentSkitId = this.saveData.gameProgress.currentSkitId;
        if (currentSkitId && this.saveData.skits[currentSkitId]) {
            return this.saveData.skits[currentSkitId];
        }
        return null;
    }

    /**
     * Add a skit to the save data and update tracking
     */
    addSkit(skit: Skit): void {
        // Assign the skit to the map
        this.saveData.skits[skit.id] = skit;
        
        // Track in order
        if (!this.saveData.gameProgress.skitOrder.includes(skit.id)) {
            this.saveData.gameProgress.skitOrder.push(skit.id);
        }
        
        // Set as current skit
        this.saveData.gameProgress.currentSkitId = skit.id;
    }

    /**
     * Get skits in chronological order
     */
    getSkitsInOrder(): Skit[] {
        return this.saveData.gameProgress.skitOrder
            .map(id => this.saveData.skits[id])
            .filter(skit => skit !== undefined);
    }

    createInitialGameProgress(): GameProgressState {
        return {
            currentPhase: GamePhase.GAME_INTRO,
            contestantsIntroduced: [],
            finalistIds: [],
            losersInterviewed: [],
            finalistsInterviewed: [],
            playerChoice: null,
            hostChoice: null,
            audienceChoice: null,
            winnerId: null,
            currentSkitId: null,
            skitOrder: [],
        };
    }

    // Helper methods for game progression
    getCurrentPhase(): GamePhase {
        return this.saveData.gameProgress.currentPhase;
    }

    advancePhase(newPhase: GamePhase): void {
        this.saveData.gameProgress.currentPhase = newPhase;
        this.saveGame();
    }

    markContestantIntroduced(actorId: string): void {
        if (!this.saveData.gameProgress.contestantsIntroduced.includes(actorId)) {
            this.saveData.gameProgress.contestantsIntroduced.push(actorId);
            this.saveGame();
        }
    }

    setFinalists(actorIds: string[]): void {
        this.saveData.gameProgress.finalistIds = actorIds;
        this.saveGame();
    }

    markFinalistInterviewed(actorId: string): void {
        if (!this.saveData.gameProgress.finalistsInterviewed.includes(actorId)) {
            this.saveData.gameProgress.finalistsInterviewed.push(actorId);
            this.saveGame();
        }
    }

    setPlayerChoice(actorId: string): void {
        this.saveData.gameProgress.playerChoice = actorId;
        this.saveGame();
    }

    setHostChoice(actorId: string): void {
        this.saveData.gameProgress.hostChoice = actorId;
        this.saveGame();
    }

    setAudienceChoice(actorId: string): void {
        this.saveData.gameProgress.audienceChoice = actorId;
        this.saveGame();
    }

    setWinner(actorId: string): void {
        this.saveData.gameProgress.winnerId = actorId;
        this.saveGame();
    }

    // Check if all contestants have been introduced
    allContestantsIntroduced(): boolean {
        const contestants = this.getContestantActors();
        return this.saveData.gameProgress.contestantsIntroduced.length >= contestants.length;
    }

    // Check if all finalists have had one-on-one interviews
    allFinalistsInterviewed(): boolean {
        return this.saveData.gameProgress.finalistsInterviewed.length >= this.saveData.gameProgress.finalistIds.length;
    }

    // Get the next contestant to introduce
    getNextContestantToIntroduce(): Actor | null {
        const contestants = this.getContestantActors();
        return contestants.find(c => !this.saveData.gameProgress.contestantsIntroduced.includes(c.id)) || null;
    }

    // Get the next finalist to interview
    getNextFinalistToInterview(): Actor | null {
        const finalistId = this.saveData.gameProgress.finalistIds.find(
            id => !this.saveData.gameProgress.finalistsInterviewed.includes(id)
        );
        return finalistId ? this.saveData.actors[finalistId] : null;
    }

    // Get losers (all contestants who are not finalists)
    getLoserActors(): Actor[] {
        const finalistIds = this.saveData.gameProgress.finalistIds;
        return this.getContestantActors().filter(c => !finalistIds.includes(c.id));
    }

    // Get pairs of losers who haven't been interviewed yet
    getNextLoserPair(): Actor[] | null {
        const losers = this.getLoserActors();
        const uninterviewedLosers = losers.filter(c => !this.saveData.gameProgress.losersInterviewed.includes(c.id));
        
        // Return pairs of losers (2 at a time)
        if (uninterviewedLosers.length >= 2) {
            return uninterviewedLosers.slice(0, 2);
        } else if (uninterviewedLosers.length === 1) {
            // If only one loser remains, include them
            return uninterviewedLosers;
        }
        return null;
    }

    // Mark losers as interviewed
    markLosersInterviewed(actorIds: string[]): void {
        actorIds.forEach(id => {
            if (!this.saveData.gameProgress.losersInterviewed.includes(id)) {
                this.saveData.gameProgress.losersInterviewed.push(id);
            }
        });
        this.saveGame();
    }

    // Check if all losers have been interviewed
    allLosersInterviewed(): boolean {
        const losers = this.getLoserActors();
        return losers.every(loser => this.saveData.gameProgress.losersInterviewed.includes(loser.id));
    }

    // Callback to show priority messages in the tooltip bar
    private priorityMessageCallback?: (message: string, icon?: any, durationMs?: number) => void;

    /**
     * Register a callback to show priority messages in the tooltip bar.
     * This is typically set by the App component that has access to the TooltipContext.
     */
    setPriorityMessageCallback(callback: (message: string, icon?: any, durationMs?: number) => void) {
        this.priorityMessageCallback = callback;
    }

    /**
     * Show a priority message in the tooltip bar that temporarily overrides normal tooltips.
     * @param message The message to display
     * @param icon Optional icon to show with the message
     * @param durationMs How long to show the message (default: 5000ms)
     */
    showPriorityMessage(message: string, icon?: any, durationMs: number = 5000) {
        if (this.priorityMessageCallback) {
            this.priorityMessageCallback(message, icon, durationMs);
        } else {
            console.warn('Priority message callback not set:', message);
        }
    }

    isVerticalLayout(): boolean {
        // Determine if the layout should be vertical based on window aspect ratio
        // Vertical layout when height > width (portrait orientation)
        return window.innerHeight > window.innerWidth;
    }

    render(): ReactElement {
        return <BaseScreen stage={() => this}/>;
    }

}
