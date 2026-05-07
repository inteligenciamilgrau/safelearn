const test = require('node:test');
const assert = require('node:assert/strict');
const IbgePib = require('../ibge-pib.js');

const shouldRunLiveTests = process.env.RUN_LIVE_IBGE_TESTS === '1';

test('contrato vivo com as fontes de indicadores estaduais', { skip: !shouldRunLiveTests }, async () => {
    assert.equal(typeof fetch, 'function');

    const verification = await IbgePib.fetchStateIndicators(fetch);

    assert.equal(verification.checks.pib.metadataPassed, true);
    assert.equal(verification.checks.pib.stateValidation.receivedCount, 27);
    assert.equal(verification.checks.pib.stateValidation.passed, true);
    assert.equal(verification.checks.pib.totalCheckPassed, true);
    assert.ok(
        verification.checks.pib.absoluteDifferenceMilReais <= IbgePib.PIB_CONFIG.totalTolerance,
        `Diferença do PIB acima da tolerância: ${verification.checks.pib.absoluteDifferenceMilReais}`
    );

    assert.equal(verification.checks.population.metadataPassed, true);
    assert.equal(verification.checks.population.stateValidation.receivedCount, 27);
    assert.equal(verification.checks.population.difference, 0);
    assert.equal(verification.checks.idhm.passed, true);
});
