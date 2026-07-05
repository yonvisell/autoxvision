type ScoreBadgeProps = {
  score: number;
  highScore: number;
};

export function ScoreBadge({ score, highScore }: ScoreBadgeProps) {
  return (
    <div className="score-badge" aria-label="Score">
      <span>
        Score <strong>{score}</strong>
      </span>
      <span>
        High score <strong>{highScore}</strong>
      </span>
    </div>
  );
}
