import "./sports101.css";
export default function Sports101(){
  const blocks = [
    {title:"Football (5-a-side)", text:"2×20 min halves, rolling subs, no slide tackles on turf."},
    {title:"Cricket (Tape/Tennis)", text:"6–8 players, 8 overs, max 2 overs per bowler, LBW optional."},
    {title:"Badminton", text:"21-point rally scoring, best of 3 games; wear non-marking shoes."},
    {title:"Volleyball", text:"Best of 5 sets to 25 (15 in tie-break), rotate clockwise on side-out."},
    {title:"Futsal", text:"5 players, size-4 low-bounce ball, kick-ins instead of throw-ins."},
    {title:"Table Tennis", text:"11-point games, serve alternates every 2 points."},
  ];
  return (
    <div className="sports-guide">
      <h1>Sports 101</h1>
      <div className="grid-3">
        {blocks.map((b,i)=>(
          <div className="rule" key={i}>
            <h3>{b.title}</h3>
            <p>{b.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
