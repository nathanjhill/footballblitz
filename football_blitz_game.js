import React, { useState, useEffect } from "react";

const NFL_TEAMS = [
  "49ers", "Bears", "Bengals", "Bills", "Broncos", "Browns", "Buccaneers", "Cardinals",
  "Chargers", "Chiefs", "Colts", "Commanders", "Cowboys", "Dolphins", "Eagles", "Falcons",
  "Giants", "Jaguars", "Jets", "Lions", "Packers", "Panthers", "Patriots", "Raiders",
  "Rams", "Ravens", "Saints", "Seahawks", "Steelers", "Texans", "Titans", "Vikings"
];

function rint(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function fgMakeProb(distance) {
  if (distance <= 25) return 0.95;
  if (distance <= 35) return 0.85;
  if (distance <= 45) return 0.7;
  if (distance <= 55) return 0.55;
  return 0.35;
}

const PLAYBOOK = {
  "Short Run": { success: 0.6, yards: [2, 5], sack: 0, turnover: 0.05, penalty: 0.1 },
  Sweep: { success: 0.5, yards: [0, 10], sack: 0, turnover: 0.05, penalty: 0.1 },
  "QB Sneak": { success: 0.7, yards: [1, 3], sack: 0.05, turnover: 0.05, penalty: 0.1 },
  "Screen Pass": { success: 0.55, yards: [0, 8], sack: 0.05, turnover: 0.05, penalty: 0.1 },
  Slant: { success: 0.5, yards: [5, 12], sack: 0.1, turnover: 0.1, penalty: 0.1 },
  Hook: { success: 0.45, yards: [5, 15], sack: 0.1, turnover: 0.1, penalty: 0.1 },
  "Deep Ball": { success: 0.3, yards: [15, 40], sack: 0.15, turnover: 0.15, penalty: 0.1 }
};

function pickYards(min, max) {
  return rint(min, max);
}

export default function FootballBlitz() {
  const [teamSelected, setTeamSelected] = useState(false);
  const [team, setTeam] = useState(NFL_TEAMS[0]);

  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [ballPos, setBallPos] = useState(50);
  const [down, setDown] = useState(1);
  const [yardsToFirst, setYardsToFirst] = useState(10);
  const [playByPlay, setPlayByPlay] = useState([]);
  const [extraPointMode, setExtraPointMode] = useState(false);
  const [possession, setPossession] = useState("Player");
  const [animating, setAnimating] = useState(false);
  const [targetBallPos, setTargetBallPos] = useState(50);

  useEffect(() => {
    if (animating) {
      const interval = setInterval(() => {
        setBallPos(prev => {
          if (Math.abs(prev - targetBallPos) < 0.5) {
            setAnimating(false);
            clearInterval(interval);
            if (possession === "Opponent") {
              simulateOpponentPlay();
            }
            return targetBallPos;
          }
          return prev < targetBallPos ? prev + 0.5 : prev - 0.5;
        });
      }, 10);
      return () => clearInterval(interval);
    }
  }, [animating, targetBallPos, possession]);

  const addPlayByPlay = (text) => {
    setPlayByPlay(prev => [...prev, text]);
  };

  const handlePlay = (play) => {
    if (extraPointMode) {
      let success;
      if (play === "Kick XP") {
        success = Math.random() < fgMakeProb(33);
        if (success) setPlayerScore(s => s + 1);
        addPlayByPlay(success ? "Extra point good!" : "Extra point missed!");
      } else if (play === "2-Point Try") {
        success = Math.random() < 0.47;
        if (success) setPlayerScore(s => s + 2);
        addPlayByPlay(success ? "2pt conversion good!" : "2pt conversion failed!");
      }
      setExtraPointMode(false);
      resetDrive();
      setPossession("Opponent");
      simulateOpponentPlay();
      return;
    }

    if (play === "Punt") {
      addPlayByPlay("Player punts.");
      resetDrive();
      setPossession("Opponent");
      simulateOpponentPlay();
      return;
    }

    if (play === "Field Goal") {
      const success = Math.random() < 0.7;
      if (success) {
        setPlayerScore(s => s + 3);
        addPlayByPlay("Field goal good!");
      } else {
        addPlayByPlay("Field goal missed!");
      }
      resetDrive();
      setPossession("Opponent");
      simulateOpponentPlay();
      return;
    }

    simulateBallMove(play, "Player");
  };

  const simulateBallMove = (play, who) => {
    const pb = PLAYBOOK[play];
    if (!pb) return;

    // Bad events
    const rand = Math.random();
    if (rand < pb.penalty) {
      const yardsLost = pickYards(5,10);
      addPlayByPlay(`${who} penalized for ${yardsLost} yards.`);
      moveBall(-yardsLost, who);
      advanceDown(0, who);
      return;
    }
    if (rand < pb.penalty + pb.sack) {
      const yardsLost = pickYards(5,12);
      addPlayByPlay(`${who} sacked for ${yardsLost} yards.`);
      moveBall(-yardsLost, who);
      advanceDown(0, who);
      return;
    }
    if (rand < pb.penalty + pb.sack + pb.turnover) {
      addPlayByPlay(`Turnover! ${who === "Player" ? "Opponent" : "Player"} takes over.`);
      resetDrive();
      setPossession(who === "Player" ? "Opponent" : "Player");
      if (who === "Player") simulateOpponentPlay();
      return;
    }

    const gain = pickYards(pb.yards[0], pb.yards[1]);
    addPlayByPlay(`${who} gains ${gain} yards with ${play}.`);
    moveBall(gain, who);
  };

  const moveBall = (yards, who) => {
    let newPos = ballPos + (who === "Player" ? yards : -yards);
    newPos = Math.max(0, Math.min(100, newPos));
    setTargetBallPos(newPos);
    setAnimating(true);
    if (who === "Player") advanceDown(yards, who);
  };

  const advanceDown = (gain, who) => {
    if (who === "Player") {
      let newYards = yardsToFirst - gain;
      if (ballPos + gain >= 100) {
        addPlayByPlay("Touchdown!");
        setPlayerScore(s => s + 6);
        setExtraPointMode(true);
      } else if (newYards <= 0) {
        addPlayByPlay("First down!");
        setDown(1);
        setYardsToFirst(10);
      } else {
        setDown(d => d+1);
        setYardsToFirst(newYards);
        if (down >= 4) {
          addPlayByPlay("Turnover on downs!");
          resetDrive();
          setPossession("Opponent");
          simulateOpponentPlay();
        }
      }
    }
  };

  const resetDrive = () => {
    setBallPos(50);
    setDown(1);
    setYardsToFirst(10);
  };

  const simulateOpponentPlay = () => {
    if (possession !== "Opponent") return;
    const plays = Object.keys(PLAYBOOK);
    const choice = plays[rint(0, plays.length-1)];
    setTimeout(() => simulateBallMove(choice, "Opponent"), 800);
  };

  if (!teamSelected) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75">
        <div className="bg-white p-6 rounded">
          <h2 className="text-xl mb-4">Select Your Team</h2>
          <select value={team} onChange={e => setTeam(e.target.value)} className="mb-4">
            {NFL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => setTeamSelected(true)} className="bg-blue-600 text-white px-4 py-2 rounded">Start Game</button>
        </div>
      </div>
    );
  }

  const plays = extraPointMode ? ["Kick XP", "2-Point Try"] : [...Object.keys(PLAYBOOK), ...(down === 4 ? ["Punt"] : []), ...(ballPos >= 60 ? ["Field Goal"] : [])];

  return (
    <div className="flex w-full h-screen bg-green-700">
      <div className="flex-1 relative flex items-center justify-center">
        <div className="w-3/4 h-3/4 bg-green-600 border-4 border-white relative">
          <div style={{ position: 'absolute', left: `${ballPos}%`, top: '50%', transform: 'translate(-50%, -50%)', width: '20px', height: '20px', backgroundColor: 'brown', borderRadius: '50%' }}></div>
        </div>
      </div>
      <div className="w-80 bg-black text-white p-4 overflow-y-auto">
        <h1 className="text-xl font-bold mb-2">Football Blitz</h1>
        <p>Coaching: {team}</p>
        <p>Possession: {possession}</p>
        <p>Player Score: {playerScore}</p>
        <p>Opponent Score: {opponentScore}</p>
        <p>Down: {down} & {yardsToFirst}</p>
        <div className="mt-4 space-y-2">
          {plays.map(play => (
            <button key={play} onClick={() => handlePlay(play)} className="w-full bg-blue-800 hover:bg-blue-600 rounded p-2">
              {play}
            </button>
          ))}
        </div>
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-2">Play-by-Play</h2>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {playByPlay.map((line, idx) => <div key={idx} className="text-sm">{line}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
