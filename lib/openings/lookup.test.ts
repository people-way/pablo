import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findCatalogOpening, getOpeningLookup } from "./lookup";

describe("getOpeningLookup", () => {
  it("keeps a Chess.com Najdorf on the catalog entry the report can look up by name", () => {
    const lookup = getOpeningLookup("B90", "Sicilian Defense: Najdorf Variation, English Attack");

    assert.equal(lookup.name, "Sicilian Defense, Najdorf Variation");
    assert.equal(lookup.key, "sicilian-defense");
    assert.equal(lookup.catalogEntry?.opening_id, "sicilian_najdorf");

    const reportLookup = findCatalogOpening(null, lookup.name);
    assert.equal(reportLookup?.opening_id, "sicilian_najdorf");
    assert.match(reportLookup?.typical_black_plan ?? "", /counterplay|queenside|e5/i);
    assert.ok((reportLookup?.common_mistakes_club_players.length ?? 0) > 0);
  });

  it("matches a Najdorf header even when the ECO code is missing", () => {
    const lookup = getOpeningLookup(null, "Sicilian Defense: Najdorf Variation");

    assert.equal(lookup.catalogEntry?.opening_id, "sicilian_najdorf");
    assert.equal(findCatalogOpening(null, lookup.name)?.opening_id, "sicilian_najdorf");
  });

  it("leaves a generic Sicilian on the family when no variation is named", () => {
    const lookup = getOpeningLookup("B20", "Sicilian Defense");

    assert.equal(lookup.name, "Sicilian Defense");
    assert.equal(lookup.key, "sicilian-defense");
    assert.equal(lookup.catalogEntry, null);
    assert.equal(findCatalogOpening(null, lookup.name), null);
  });

  it("does not attach the English Attack to both Najdorf and Scheveningen", () => {
    const lookup = getOpeningLookup(null, "English Attack");

    assert.equal(lookup.catalogEntry, null);
    assert.equal(lookup.name, "English Attack");
  });

  it("uses the Tarrasch plan for the ECO codes it shares with the Queen's Gambit Declined", () => {
    const lookup = getOpeningLookup("D32", "Queen's Gambit Declined: Tarrasch Defense");

    assert.equal(lookup.name, "Tarrasch Defense");
    assert.equal(lookup.catalogEntry?.opening_id, "tarrasch_defense");
    assert.match(findCatalogOpening(null, lookup.name)?.typical_black_plan ?? "", /IQP|isolated/i);
  });

  it("keeps an ordinary Queen's Gambit Declined on that catalog entry", () => {
    const lookup = getOpeningLookup("D35", "Queen's Gambit Declined: Orthodox Defense");

    assert.equal(lookup.name, "Queen's Gambit Declined");
    assert.equal(lookup.catalogEntry?.opening_id, "queens_gambit_declined");
    assert.equal(findCatalogOpening(null, lookup.name)?.opening_id, "queens_gambit_declined");
  });

  it("maps Two Knights ECO codes onto the Italian plans", () => {
    const lookup = getOpeningLookup("C58", "Italian Game: Two Knights Defense, Polerio Defense");

    assert.equal(lookup.name, "Italian Game");
    assert.equal(lookup.key, "italian-game");
    assert.equal(lookup.catalogEntry?.opening_id, "italian_game");
    assert.match(lookup.catalogEntry?.typical_white_plan ?? "", /c3|d4|f7/i);
  });

  it("matches Alekhine with or without the possessive", () => {
    const fromEco = getOpeningLookup("B03", "Alekhine Defense: Four Pawns Attack");
    const fromName = getOpeningLookup(null, "Alekhine Defense");

    assert.equal(fromEco.catalogEntry?.opening_id, "alekhine_defense");
    assert.equal(fromName.catalogEntry?.opening_id, "alekhine_defense");
    assert.equal(findCatalogOpening(null, fromEco.name)?.opening_id, "alekhine_defense");
  });

  it("uses the Pirc catalog title instead of the combined family label", () => {
    const lookup = getOpeningLookup("B09", "Pirc Defense: Austrian Attack");

    assert.equal(lookup.name, "Pirc Defense");
    assert.equal(lookup.key, "pirc-defense");
    assert.notEqual(lookup.name, "Pirc / Modern Defense");
    assert.equal(findCatalogOpening(null, lookup.name)?.opening_id, "pirc_defense");
  });

  it("still recognizes the London and the Grünfeld from Chess.com spellings", () => {
    assert.equal(getOpeningLookup("D02", "London System").catalogEntry?.opening_id, "london_system");
    assert.equal(
      getOpeningLookup("D85", "Grunfeld Defense: Exchange Variation").catalogEntry?.opening_id,
      "grunfeld_defense",
    );
    assert.equal(findCatalogOpening(null, "Grünfeld Defense")?.opening_id, "grunfeld_defense");
  });
});
