const games = [
  {
    href: "/pablo",
    index: "01",
    kicker: "Échecs",
    title: "Pablo",
    blurb: "Le coach qui relit tes parties et tes ouvertures, sans te ménager.",
    cue: "Entrer",
    tone: "pablo",
  },
  {
    href: "/street-tycoons",
    index: "02",
    kicker: "Arcade",
    title: "Street Tycoons",
    blurb: "Un petit jeu sur de grands hommes. Satire, cabinet, deux joueurs.",
    cue: "Press start",
    tone: "street",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <header className="mast">
        <p className="mark">
          <span>Anarchik</span>
          <span className="slash">/</span>
          <span>Games</span>
        </p>
        <h1>
          Deux jeux.
          <br />
          Une adresse.
        </h1>
        <p className="lede">Le studio tient sur cette page. Choisis une table.</p>
      </header>

      <ul className="games">
        {games.map((game) => (
          <li key={game.href}>
            <a className={`card ${game.tone}`} href={game.href}>
              <span className="index">{game.index}</span>
              <span className="kicker">{game.kicker}</span>
              <strong>{game.title}</strong>
              <span className="blurb">{game.blurb}</span>
              <span className="cue">{game.cue}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
