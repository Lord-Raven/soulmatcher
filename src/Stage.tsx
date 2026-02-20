import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message, Character, User} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import { Actor, loadReserveActorFromFullPath, findBestNameMatch, removeBackgroundFromEmotionImage } from "./Actor";
import { generateSkitScript, Skit, SkitType } from "./Skit";
import { BaseScreen } from "./Screens/BaseScreen";
import { Emotion } from "./Emotion";

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
    includeTags?: string[];
    spice?: number;  // 1-3 scale for content rating (1=flirty, 2=dirty, 3=explicit)
    gameProgress: GameProgressState;
    removeBackgrounds?: boolean;
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    readonly FETCH_AT_TIME = 6;
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
    readonly characterSearchQuery = `https://inference.chub.ai/search?first=${this.FETCH_AT_TIME}&exclude_tags={{EXCLUSIONS}}&page={{PAGE_NUMBER}}&tags={{SEARCH_TAGS}}&sort=random&asc=false&include_forks=false&nsfw=true&nsfl=false` +
        `&nsfw_only=false&require_images=false&require_example_dialogues=false&require_alternate_greetings=false&require_custom_prompt=false&exclude_mine=false&min_tokens=200&max_tokens=5000` +
        `&require_expressions=true&require_lore=false&mine_first=false&require_lore_embedded=false&require_lore_linked=false&my_favorites=false&inclusive_or=true&recommended_verified=false&count=false&min_tags=3`;
    readonly characterDetailQuery = 'https://inference.chub.ai/api/characters/{fullPath}?full=true';
    private actorPageNumber = Math.max(1, Math.floor(Math.random() * this.MAX_PAGES));
    readonly CONTESTANT_COUNT = 5;
    loadPromises: Promise<void>[] = [];

    saveData: ChatStateType;
    primaryUser: User
    primaryCharacter: Character;
    betaMode = false;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        const {
            users,
            characters,
            chatState,
            config
        } = data;

        this.primaryUser = Object.values(users)[0];
        this.primaryCharacter = Object.values(characters)[0];

        this.betaMode = config?.beta_mode === "True";

        if (chatState) {
            this.saveData = chatState;
            // Ensure gameProgress exists for older saves
            if (!this.saveData.gameProgress) {
                this.saveData.gameProgress = this.createInitialGameProgress();
            }
            if (!this.saveData.includeTags) {
                this.saveData.includeTags = ['Male', 'Female', 'Transgender', 'Nonbinary', 'Futanari'];
            }
        } else {
            this.saveData = {
                actors: {},
                skits: {},
                disableTextToSpeech: false,
                language: 'English',
                bannedTags: [],
                includeTags: ['Male', 'Female', 'Transgender', 'Nonbinary', 'Futanari'],
                spice: 2,
                gameProgress: this.createInitialGameProgress(),
                removeBackgrounds: false,
            };
        }
        console.log(this.saveData);
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
            description: `The lithe-and-spritely Roman god of love, Cupid. He wears a classic, loose toga over his slim frame and carries a wireless microphone. His pink caesar-cut hair bears golden laurels, and his matching pink eyes dart and twinkle with perpetual mischief. He flits upon angelic wings or lounges in ridiculously languid poses—never simply standing.`, // this.primaryCharacter.description || '',
            profile: `The Roman god of love, mischief, and matchmaking. He delights in orchestrating romantic encounters and spreading affection among mortals. The quick-talking Cupid somehow manages to be bratty-yet-suave in a frustratingly charming way. Today, he's hosting reality television; tomorrow? Maybe he'll start a war.`, // this.primaryCharacter.personality || '',
            motive: `To create the most entertaining and heartwarming dating show in history, while subtly puppeteering events to his amusement. Cupid secretly dislikes much of the show's branding, including the mixed-case title, "SoulMatcher," and the golden "baby Cupid" silhouettes (imagery that has long been a thorn in his side).`, // this.primaryCharacter.motive || '',
            themeColor: '#FF69B4',
            themeFontFamily: 'Arial, sans-serif',
            voiceId: 'light_male_20s',
            //emotionPack: this.primaryCharacter.partial_extensions?.chub?.expressions?.expressions
            emotionPack: {
                'admiration': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/04b1739a-41fe-4c3e-9d2a-3b958c8779f7/9f96122f-c133-4ea9-aa1f-1d3efecc9c4d.png',
                'amusement': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/112d1085-6ec0-41cd-a3c4-d52d93d13cc6/a1cc4317-4555-4107-a3f8-4c93a6fa782c.png',
                'anger': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/583a8240-dcc7-4c51-b5b0-5b82103bd33c/e2d942a5-df98-44dd-97b9-d925a4339562.png',
                'annoyance': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/e8ed71f6-eee9-407b-9ca6-df4972ab5d55/256be484-751a-4b8d-9f90-da5b4ce291ed.png',
                'approval': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/bdcd0759-c557-4f9a-af67-998e2a1b1724/47a8f337-f94f-478a-a2c2-1f1bb29d3fc0.png',
                'caring': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/94cb58a2-fced-482d-8947-c4f1f99336d6/5b543740-1db4-48eb-9ee9-6bdc7ba45bdc.png',
                'confusion': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/fd40fd26-5429-43b1-a90f-b921f52e9a65/6f3715a1-d143-4e7c-8ddf-c6b01b6596e7.png',
                'curiosity': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/331556c7-1563-457d-93ae-280fb647a8a9/575032da-7143-4812-bacc-6987f198307d.png',
                'desire': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/55d663b8-67eb-484d-a878-bfe6d9ad73b5/fd600ec1-c858-4af5-b3d9-f6771fd0fc58.png',
                'disappointment': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/d7d2da5b-5c35-4f4e-a8f6-8f945e2ef5fd/7132fac5-5a68-4ad1-831c-aaa416db1460.png',
                'disapproval': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/e06dac38-9eef-47e7-9cb0-dcf4771688a8/ce6b9ac4-666e-45fd-81c3-7813e6aa2727.png',
                'disgust': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/e8ba75d6-b114-4d11-acbd-f968298b35b2/6bed1e06-2d3b-4357-b3fd-a1b4e6dc611d.png',
                'embarrassment': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/3b270970-f428-4c7e-b0e5-4fdd5f787205/2029bb29-0c95-437d-b140-9685b7bbfdae.png',
                'excitement': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/0bd9f1c9-0a53-4912-810d-13c222a93633/b90a3e17-c918-4220-b129-fd211a9b9262.png',
                'fear': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/74ff72d6-882e-4784-a890-19f59ca034c9/afbb9b32-04e4-4be2-a12c-f4baec356cd8.png',
                'gratitude': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/97a2eb9f-44cc-4dfb-9fd5-cc5c73d3ca43/6fd0c4b0-42ab-4e5b-85d3-fd444b9ce0af.png',
                'grief': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/6310cd7d-8453-49d5-9b83-c3b1b97450be/036fdcb4-db7b-4c04-b419-10e5e57653d5.png',
                'joy': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/c4bd5e05-f02a-45e9-b344-0d92616ba7f0/0bcb022e-49ad-4d38-a755-53ac7a36b364.png',
                'love': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/9e34db68-9e51-4046-87f6-60f68bb69d8c/8fb1bd2b-daee-4f25-9f99-d7de50913414.png',
                'nervousness': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/c548994a-30b9-45a4-88da-17830f905f2c/c8435a70-9283-4ce8-85dc-730c70511d39.png',
                'optimism': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/2af67729-784a-4e15-8d6e-e3df14fab918/04fc7739-dd09-4eca-9bcf-614ae53ef856.png',
                'pride': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/1ce61830-246c-4453-9f66-9782f88e9f7d/96e8c6ca-f019-402a-945c-968705e4933c.png',
                'realization': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/f3b26fd7-6f4c-4084-8571-b1697138a765/9d5f7c01-1df2-49fe-85c2-a1faf8b899a5.png',
                'relief': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/6cc0c3d1-9c38-415e-9d85-2fb95127db09/8248f5f6-c77b-4b45-96a9-cd8a54d5e833.png',
                'remorse': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/cffb02af-ed95-45dd-9bd8-524100251b45/d6df467a-a055-471b-adab-a70aba3c8129.png',
                'sadness': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/bae72d23-affe-437b-8d38-d8fcacda9695/80701bab-58d7-4991-9c65-5aafcc88af11.png',
                'surprise': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/e134e752-95a7-45f2-b534-5fe5bf1315a4/d4693f67-637d-497c-b974-52e9c6a55929.png',
                'neutral': 'https://avatars.charhub.io/avatars/uploads/images/gallery/file/8aeba0f9-54b7-4970-8ade-04eec70d9adf/d0ffdcaa-d5dc-4925-8cae-87f755c4803e.png',
            }
        });

        console.log('Host actor emotion pack:');
        console.log(hostActor.emotionPack);
        console.log(this.primaryCharacter.partial_extensions);

        this.saveData.actors[hostActor.id] = hostActor;

        // Contestants - load asynchronously:
        console.log('Starting contestant loading...');
        // Clear any existing load promises
        this.loadPromises = [];

        let beenToStart = false;
        
        // Create the asynchronous contestant loading promise
        const contestantLoadPromise = (async () => {
            let reserveActors: Actor[] = [];
            while (reserveActors.length < this.CONTESTANT_COUNT) {
                // Populate reserveActors; this is loaded with data from a service, calling the characterServiceQuery URL:
                const exclusions = (this.saveData.bannedTags || []).concat(this.bannedTagsDefault).map(tag => encodeURIComponent(tag)).join('%2C');
                const inclusions = (this.saveData.includeTags || []).map(tag => encodeURIComponent(tag)).join('%2C');
                const response = await fetch(this.characterSearchQuery
                    .replace('{{PAGE_NUMBER}}', this.actorPageNumber.toString())
                    .replace('{{EXCLUSIONS}}', exclusions ? exclusions : '')
                    .replace('{{SEARCH_TAGS}}', inclusions ? inclusions : ''));
                const searchResults = await response.json();
                console.log(searchResults);
                // Need to do a secondary lookup for each character in searchResults, to get the details we actually care about:
                const basicCharacterData = searchResults.data?.nodes.map((item: any) => item.fullPath) || [];
                if (basicCharacterData.length === 0) {
                    console.log('No more characters found in search results; resetting to first page.');
                    this.actorPageNumber = 1; // reset to first page if we run out of results
                } else {
                    this.actorPageNumber = (this.actorPageNumber % this.MAX_PAGES) + 1;
                }
                console.log(basicCharacterData);

                const newActors: Actor[] = await Promise.all(basicCharacterData.map(async (fullPath: string) => {
                    try {
                        return await loadReserveActorFromFullPath(fullPath, this);
                    } catch (error) {
                        console.error(`Error loading actor from path ${fullPath}:`, error);
                        return null;
                    }
                }));

                // Remove null actors
                const nonNullActors = newActors.filter(a => a !== null);

                // Remove internal duplicates within newActors (in case two near-duplicates came in same batch)
                const uniqueNewActors = nonNullActors.filter((actor, index, self) => {
                    return !findBestNameMatch(actor.name, self.slice(0, index));
                });

                // Remove duplicates against existing reserveActors
                const validNewActors = uniqueNewActors.filter(a => {
                    return findBestNameMatch(a.name, reserveActors) === null;
                });

                // Cut down validNewActors length if it will put us over the needed contestant count.
                const slotsLeft = this.CONTESTANT_COUNT - reserveActors.length;
                const actorsToAdd = validNewActors.slice(0, slotsLeft);

                // Need to do background removal for neutrals if flagged.
                console.log(`Potentially removing backgrounds.`);
                await Promise.all(actorsToAdd.map(async actor => {
                    if (actor.flagForBackgroundRemoval) {
                        console.log(`Remove background from ${actor.name}'s neutral image.`);
                        await removeBackgroundFromEmotionImage(actor, Emotion.neutral, this);
                    }
                }));
                console.log('Done removing backgrounds.');

                reserveActors = [...reserveActors, ...actorsToAdd];

                if (reserveActors.length < this.CONTESTANT_COUNT) {
                    if (this.actorPageNumber == 1) {
                        if (!beenToStart) {
                            beenToStart = true;
                        } else {
                            // We have to have exhausted everything at this point. Need to give up and leave a tooltip.
                            this.showPriorityMessage(`Unable to find ample eligible candidates with current search parameters. Adjust tags or enable background removal to expand the field.`, 5000);
                            throw new Error('Exhausted all character search results without finding enough valid contestants.');
                        }
                    }
                    console.log(`Only found ${reserveActors.length} valid contestants so far; continuing search...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.log(`Found ${reserveActors.length} valid contestants!`);
                    console.log(reserveActors);
                    // Cut down to the exact number needed, in case we got extras from the last search
                    reserveActors = reserveActors.slice(0, this.CONTESTANT_COUNT);
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
