import { useState, useEffect, useRef } from 'react';
import { Search, Clock, Smile, Ghost, Coffee, Heart, Car, Bell, Flag, Zap, Image } from 'lucide-react';
import { EMOJI_MAP } from '@/lib/emojiData';

const TABS = [
  { id: 'emoji', name: '絵文字', icon: Smile },
  { id: 'gif', name: 'GIF', icon: Image },
];

const CATEGORIES = [
  { id: 'recent', name: 'よく使う絵文字', icon: Clock, keys: [] },
  { 
    id: 'smileys', 
    name: 'スマイルと感情', 
    icon: Smile, 
    keys: ['grinning', 'smiley', 'smile', 'grin', 'laughing', 'sweat_smile', 'rofl', 'joy', 
           'slight_smile', 'upside_down', 'wink', 'blush', 'innocent', 'heart_eyes', 'star_eyes', 
           'kissing_heart', 'kissing', 'yum', 'stuck_out_tongue', 'stuck_out_tongue_wink_eye', 
           'zany_face', 'stuck_out_tongue_closed_eyes', 'money_mouth', 'hugging', 'shushing', 
           'thinking', 'zipper_mouth', 'neutral_face', 'expressionless', 'no_mouth', 'smirk', 
           'unamused', 'roll_eyes', 'grimacing', 'lying_face', 'relieved', 'pensive', 'sleepy', 
           'sleeping', 'mask', 'thermometer_face', 'head_bandage', 'nauseated', 'vomiting', 
           'sneezing', 'hot_face', 'cold_face', 'woozy_face', 'dizzy_face', 'exploding_head', 
           'cowboy', 'partying_face', 'sunglasses', 'nerd', 'monocle', 'confused', 'worried', 
           'frowning', 'open_mouth', 'hushed', 'astonished', 'flushed', 'pleading', 'frowning_face', 
           'anguished', 'fearful', 'cold_sweat', 'disappointed_relieved', 'cry', 'sob', 'scream', 
           'confounded', 'persevere', 'disappointed', 'sweat', 'weary', 'tired_face', 'yawn', 
           'triumph', 'rage', 'angry', 'cursing_face', 'skull', 'skull_crossbones', 'ghost', 
           'alien', 'space_invader', 'robot', 'poop'] 
  },
  { 
    id: 'nature', 
    name: '動物と自然', 
    icon: Ghost, 
    keys: ['monkey_face', 'monkey', 'gorilla', 'dog', 'dog2', 'poodle', 'wolf', 'fox_face', 
           'raccoon', 'cat', 'cat2', 'lion', 'tiger', 'tiger2', 'leopard', 'horse', 'horse2', 
           'unicorn', 'zebra', 'deer', 'cow', 'ox', 'cow2', 'pig', 'pig2', 'boar', 'pig_nose', 
           'ram', 'sheep', 'goat', 'camel', 'camel2', 'llama', 'giraffe', 'elephant', 'rhinoceros', 
           'hippo', 'mouse', 'mouse2', 'rat', 'hamster', 'rabbit', 'rabbit2', 'chipmunk', 
           'hedgehog', 'bat', 'bear', 'panda_face', 'kangaroo', 'badger', 'paw_prints', 'turkey', 
           'chicken', 'rooster', 'hatching_chick', 'baby_chick', 'hatched_chick', 'bird', 'penguin', 
           'dove', 'eagle', 'duck', 'swan', 'owl', 'flamingo', 'peacock', 'parrot', 'frog', 
           'crocodile', 'turtle', 'lizard', 'snake', 'dragon_face', 'dragon', 'whale', 'whale2', 
           'dolphin', 'fish', 'tropical_fish', 'blowfish', 'shark', 'octopus', 'shell', 'snail', 
           'butterfly', 'bug', 'ant', 'bee', 'lady_beetle', 'spider', 'bouquet', 'cherry_blossom', 
           'rose', 'hibiscus', 'sunflower', 'blossom', 'tulip', 'seedling', 'evergreen_tree', 
           'palm_tree', 'cactus', 'maple_leaf', 'fallen_leaf', 'mushroom'] 
  },
  { 
    id: 'food', 
    name: '食べ物と飲み物', 
    icon: Coffee, 
    keys: ['grapes', 'melon', 'watermelon', 'tangerine', 'lemon', 'banana', 'pineapple', 'mango', 
           'apple', 'green_apple', 'pear', 'peach', 'cherries', 'strawberry', 'blueberry', 'kiwi', 
           'tomato', 'avocado', 'eggplant', 'potato', 'carrot', 'corn', 'hot_pepper', 'cucumber', 
           'broccoli', 'peanuts', 'chestnut', 'bread', 'croissant', 'cheese', 'meat_on_bone', 
           'poultry_leg', 'bacon', 'hamburger', 'fries', 'pizza', 'hotdog', 'sandwich', 'taco', 
           'burrito', 'cooking', 'salad', 'popcorn', 'bento', 'rice', 'curry', 'ramen', 'spaghetti', 
           'sushi', 'fried_shrimp', 'dango', 'dumpling', 'ice_cream', 'shaved_ice', 'doughnut', 
           'cookie', 'birthday', 'cake', 'chocolate_bar', 'candy', 'lollipop', 'custard', 
           'honey_pot', 'baby_bottle', 'glass_of_milk', 'coffee', 'tea', 'sake', 'champagne', 
           'wine_glass', 'cocktail', 'beer', 'beers', 'clinking_glasses', 'bubble_tea'] 
  },
  { 
    id: 'activity', 
    name: '活動', 
    icon: Heart, 
    keys: ['soccer', 'basketball', 'football', 'baseball', 'tennis', 'volleyball', 'rugby_football', 
           '8ball', 'ping_pong', 'badminton', 'ice_hockey', 'golf', 'kite', 'bow_and_arrow', 
           'fishing', 'boxing_glove', 'martial_arts_uniform', 'skateboard', 'roller_skate', 'ski', 
           'snowboarder', 'parachute', 'weight_lifting', 'wrestling', 'yoga', 'surfing', 'swimming', 
           'rowing', 'climbing', 'biking', 'trophy', 'first_place', 'second_place', 'third_place', 
           'medal_sports', 'ticket', 'circus_tent', 'performing_arts', 'art', 'clapper', 'microphone', 
           'headphones', 'musical_keyboard', 'drum', 'guitar', 'violin', 'game_die', 'dart', 
           'video_game', 'slot_machine', 'puzzle_piece'] 
  },
  { 
    id: 'travel', 
    name: '旅行と場所', 
    icon: Car, 
    keys: ['car', 'taxi', 'bus', 'racing_car', 'police_car', 'ambulance', 'fire_engine', 'tractor', 
           'motorcycle', 'bike', 'fuelpump', 'rotating_light', 'anchor', 'sailboat', 'speedboat', 
           'ship', 'airplane', 'rocket', 'flying_saucer', 'luggage', 'watch', 'alarm_clock', 
           'sun_with_face', 'full_moon_with_face', 'star', 'ringed_planet', 'cloud', 'partly_sunny', 
           'thunder_cloud_and_rain', 'comet', 'milky_way', 'shooting_star', 'cityscape', 
           'night_with_stars', 'bridge_at_night', 'volcano', 'mount_fuji', 'mountain', 'camping', 
           'beach_with_umbrella', 'desert_island', 'stadium', 'building_construction', 'house', 
           'office', 'hospital', 'bank', 'hotel', 'school', 'factory', 'japanese_castle', 
           'european_castle', 'wedding', 'tokyo_tower', 'statue_of_liberty', 'church', 
           'shinto_shrine', 'tent', 'sunrise', 'city_sunset', 'ferris_wheel', 'roller_coaster'] 
  },
  { 
    id: 'symbols', 
    name: '記号', 
    icon: Bell, 
    keys: ['heart', 'orange_heart', 'yellow_heart', 'green_heart', 'blue_heart', 'purple_heart', 
           'black_heart', 'white_heart', 'brown_heart', 'broken_heart', 'heart_exclamation', 
           'two_hearts', 'revolving_hearts', 'heartbeat', 'heartpulse', 'sparkling_heart', 'cupid', 
           'peace_symbol', 'latin_cross', 'star_and_crescent', 'om', 'yin_yang', 'aries', 'taurus', 
           'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 
           'aquarius', 'pisces', 'id', 'atom_symbol', 'zzz', 'atm', 'wc', 'wheelchair', 'parking', 
           'restroom', 'cinema', 'signal_strength', 'information_source', 'ng', 'ok', 'up', 'cool', 
           'new', 'free', 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 
           'nine', 'keycap_ten', '1234', 'hash', 'play_pause', 'next_track', 'fast_forward', 
           'rewind', 'arrow_right', 'arrow_left', 'arrow_up', 'arrow_down', 
           'twisted_rightwards_arrows', 'repeat', 'musical_note', 'notes', 'plus', 'minus', 
           'infinity', 'heavy_dollar_sign', 'tm', 'copyright', 'registered', 'check', 'red_circle', 
           'blue_circle', 'black_circle', 'white_circle', 'small_red_triangle', 
           'large_orange_diamond', 'red_square', 'blue_square', 'black_large_square', 
           'white_large_square', 'loud_sound', 'bell', 'speech_balloon', 'thought_balloon', 
           'spades', 'clubs', 'hearts', 'diamonds'] 
  },
  { 
    id: 'flags', 
    name: '旗', 
    icon: Flag, 
    keys: ['jp', 'us', 'kr', 'cn', 'de', 'es', 'fr', 'it', 'ru', 'gb', 'br', 'ca', 'in', 'tw', 
           'hk', 'vn', 'th', 'au', 'sg', 'nl', 'ch', 'se', 'pl', 'pt', 'mx', 'za', 'ae', 'ua', 
           'il', 'flag_white', 'flag_black', 'checkered_flag', 'triangular_flag_on_post', 
           'rainbow_flag', 'pirate_flag'] 
  },
  { 
    id: 'gestures', 
    name: 'ジェスチャー', 
    icon: Zap, 
    keys: ['thumbsup', 'thumbsdown', 'clap', 'wave', 'ok_hand', 'raised_hand', 'fist', 'punch', 
           'v', 'crossed_fingers', 'love_you', 'metal', 'call_me', 'point_left', 'point_right', 
           'point_up', 'point_down', 'pray', 'handshake', 'muscle', 'eyes', 'brain', 'fire', 
           'sparkles', 'boom'] 
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  keepOpenOnSelect?: boolean;
  onGifSelect?: (gifUrl: string) => void;
  showGifTab?: boolean;
}

export default function EmojiPicker({ onSelect, keepOpenOnSelect = false, onGifSelect, showGifTab = true }: EmojiPickerProps) {
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('emoji');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const [gifNextPos, setGifNextPos] = useState<string | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gifScrollContainerRef = useRef<HTMLDivElement>(null);

  const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';

  // Cookie helper functions
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const setCookie = (name: string, value: string, days: number = 365) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  useEffect(() => {
    // Load from cookie instead of localStorage
    const saved = getCookie('recent_emoji_keys');
    if (saved) {
      try {
        setRecentKeys(JSON.parse(decodeURIComponent(saved)));
      } catch (e) {
        console.error('Failed to parse emoji cookie:', e);
      }
    }
  }, []);

  // Load featured GIFs when GIF tab is opened
  useEffect(() => {
    if (activeTab === 'gif' && gifs.length === 0) {
      searchGifs('', false);
    }
  }, [activeTab]);

  // Infinite scroll for GIFs
  useEffect(() => {
    const container = gifScrollContainerRef.current;
    if (!container || activeTab !== 'gif') return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom && !isLoadingGifs && gifNextPos) {
        loadMoreGifs();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeTab, isLoadingGifs, gifNextPos]);

  const searchGifs = async (query: string, append: boolean = false) => {
    setIsLoadingGifs(true);
    try {
      const endpoint = query 
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (append) {
        setGifs(prev => [...prev, ...(data.results || [])]);
      } else {
        setGifs(data.results || []);
      }
      
      setGifNextPos(data.next || null);
    } catch (error) {
      console.error('Failed to fetch GIFs:', error);
      if (!append) {
        setGifs([]);
      }
    } finally {
      setIsLoadingGifs(false);
    }
  };

  const loadMoreGifs = async () => {
    if (!gifNextPos || isLoadingGifs) return;

    setIsLoadingGifs(true);
    try {
      const query = gifSearchQuery;
      const endpoint = query 
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20&pos=${gifNextPos}`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20&pos=${gifNextPos}`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      setGifs(prev => [...prev, ...(data.results || [])]);
      setGifNextPos(data.next || null);
    } catch (error) {
      console.error('Failed to load more GIFs:', error);
    } finally {
      setIsLoadingGifs(false);
    }
  };

  const handleGifSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchGifs(gifSearchQuery, false);
    // Scroll to top after search
    if (gifScrollContainerRef.current) {
      gifScrollContainerRef.current.scrollTop = 0;
    }
  };

  const handleGifClick = (gif: any) => {
    if (onGifSelect) {
      // Use the gif URL from the media formats
      const gifUrl = gif.media_formats?.gif?.url || gif.url;
      onGifSelect(gifUrl);
    }
  };

  const handleEmojiSelect = (key: string) => {
    const emoji = EMOJI_MAP[key];
    if (!emoji) return;
    onSelect(emoji);
    const updated = [key, ...recentKeys.filter(k => k !== key)].slice(0, 32);
    setRecentKeys(updated);
    // Save to cookie instead of localStorage
    setCookie('recent_emoji_keys', encodeURIComponent(JSON.stringify(updated)));
    
    // Note: We don't close the picker here anymore
    // The parent component will handle closing based on keepOpenOnSelect prop
  };

  const scrollToCategory = (id: string) => {
    const element = categoryRefs.current[id];
    if (element && scrollContainerRef.current) {
      const offset = element.offsetTop - scrollContainerRef.current.offsetTop - 8;
      scrollContainerRef.current.scrollTo({ top: offset, behavior: 'smooth' });
      setActiveCategory(id);
    }
  };

  const filteredResults = searchQuery.trim()
    ? Object.keys(EMOJI_MAP).filter(key => 
        key.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <div className="emoji-picker-container">
      <div className="emoji-picker-tabs">
        {(showGifTab ? TABS : TABS.filter(t => t.id !== 'gif')).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`emoji-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.name}
            </button>
          );
        })}
      </div>

      {activeTab === 'emoji' && (
        <div className="emoji-picker-header">
          <div className="emoji-search-wrapper">
            <Search size={16} className="emoji-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="絵文字を検索する"
              className="emoji-search-input"
            />
          </div>
        </div>
      )}

      {activeTab === 'gif' && (
        <div className="emoji-picker-header">
          <form onSubmit={handleGifSearch} className="emoji-search-wrapper">
            <Search size={16} className="emoji-search-icon" />
            <input
              type="text"
              value={gifSearchQuery}
              onChange={(e) => setGifSearchQuery(e.target.value)}
              placeholder="GIFを検索する"
              className="emoji-search-input"
            />
            <button type="submit" className="gif-search-button">
              検索
            </button>
          </form>
        </div>
      )}

      {activeTab === 'emoji' ? (
        <div className="emoji-picker-body">
        <div className="emoji-category-nav">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`emoji-category-button ${activeCategory === cat.id ? 'active' : ''}`}
                title={cat.name}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>

        <div ref={scrollContainerRef} className="emoji-grid-container">
          {filteredResults ? (
            <div className="emoji-section">
              <div className="emoji-section-title">検索結果</div>
              <div className="emoji-grid">
                {filteredResults.length > 0 ? (
                  filteredResults.slice(0, 100).map(key => (
                    <button
                      key={key}
                      onClick={() => handleEmojiSelect(key)}
                      className="emoji-button"
                      title={key}
                    >
                      {EMOJI_MAP[key]}
                    </button>
                  ))
                ) : (
                  <div className="emoji-no-results">見つかりませんでした</div>
                )}
              </div>
            </div>
          ) : (
            <>
              {recentKeys.length > 0 && (
                <div ref={el => categoryRefs.current['recent'] = el} className="emoji-section">
                  <div className="emoji-section-title">よく使う</div>
                  <div className="emoji-grid">
                    {recentKeys.map(key => (
                      <button
                        key={key}
                        onClick={() => handleEmojiSelect(key)}
                        className="emoji-button"
                        title={key}
                      >
                        {EMOJI_MAP[key]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {CATEGORIES.slice(1).map((cat) => (
                <div key={cat.id} ref={el => categoryRefs.current[cat.id] = el} className="emoji-section">
                  <div className="emoji-section-title">{cat.name}</div>
                  <div className="emoji-grid">
                    {cat.keys.map(key => (
                      <button
                        key={key}
                        onClick={() => handleEmojiSelect(key)}
                        className="emoji-button"
                        title={key}
                      >
                        {EMOJI_MAP[key]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      ) : (
        <div ref={gifScrollContainerRef} className="gif-grid-container">
          {gifs.length > 0 && (
            <div className="gif-grid">
              {gifs.map((gif) => (
                <div
                  key={gif.id}
                  className="gif-item"
                  onClick={() => handleGifClick(gif)}
                >
                  <img
                    src={gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url}
                    alt={gif.content_description || 'GIF'}
                    className="gif-image"
                  />
                </div>
              ))}
            </div>
          )}
          {isLoadingGifs && (
            <div className="gif-loading">読み込み中...</div>
          )}
          {!isLoadingGifs && gifs.length === 0 && (
            <div className="emoji-picker-placeholder">
              <Image size={48} className="placeholder-icon" />
              <p>GIFが見つかりませんでした</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
