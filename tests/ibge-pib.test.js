const test = require('node:test');
const assert = require('node:assert/strict');
const IbgePib = require('../ibge-pib.js');

const STATE_RECORDS_2023 = [
    ['11', 'Rondônia', '76456179'],
    ['12', 'Acre', '26291321'],
    ['13', 'Amazonas', '161794976'],
    ['14', 'Roraima', '25124805'],
    ['15', 'Pará', '254546511'],
    ['16', 'Amapá', '28020120'],
    ['17', 'Tocantins', '64317699'],
    ['21', 'Maranhão', '149227195'],
    ['22', 'Piauí', '80916856'],
    ['23', 'Ceará', '232239257'],
    ['24', 'Rio Grande do Norte', '101740275'],
    ['25', 'Paraíba', '96963174'],
    ['26', 'Pernambuco', '270474919'],
    ['27', 'Alagoas', '89688932'],
    ['28', 'Sergipe', '60816662'],
    ['29', 'Bahia', '430987853'],
    ['31', 'Minas Gerais', '971977551'],
    ['32', 'Espírito Santo', '209829732'],
    ['33', 'Rio de Janeiro', '1172871443'],
    ['35', 'São Paulo', '3444814033'],
    ['41', 'Paraná', '670919162'],
    ['42', 'Santa Catarina', '513392973'],
    ['43', 'Rio Grande do Sul', '650107022'],
    ['50', 'Mato Grosso do Sul', '184402118'],
    ['51', 'Mato Grosso', '273008586'],
    ['52', 'Goiás', '336746975'],
    ['53', 'Distrito Federal', '365669108']
];

const POPULATION_RECORDS_2022 = [
    ['11', 'Rondônia', '1581196'],
    ['12', 'Acre', '830018'],
    ['13', 'Amazonas', '3941613'],
    ['14', 'Roraima', '636707'],
    ['15', 'Pará', '8120131'],
    ['16', 'Amapá', '733759'],
    ['17', 'Tocantins', '1511460'],
    ['21', 'Maranhão', '6776699'],
    ['22', 'Piauí', '3271199'],
    ['23', 'Ceará', '8794957'],
    ['24', 'Rio Grande do Norte', '3302729'],
    ['25', 'Paraíba', '3974687'],
    ['26', 'Pernambuco', '9058931'],
    ['27', 'Alagoas', '3127683'],
    ['28', 'Sergipe', '2210004'],
    ['29', 'Bahia', '14141626'],
    ['31', 'Minas Gerais', '20539989'],
    ['32', 'Espírito Santo', '3833712'],
    ['33', 'Rio de Janeiro', '16055174'],
    ['35', 'São Paulo', '44411238'],
    ['41', 'Paraná', '11444380'],
    ['42', 'Santa Catarina', '7610361'],
    ['43', 'Rio Grande do Sul', '10882965'],
    ['50', 'Mato Grosso do Sul', '2757013'],
    ['51', 'Mato Grosso', '3658649'],
    ['52', 'Goiás', '7056495'],
    ['53', 'Distrito Federal', '2817381']
];

function makeResponse(level, levelName, records, overrides = {}) {
    const year = overrides.year || '2023';

    return [
        {
            id: overrides.variable || '37',
            variavel: 'Produto Interno Bruto a preços correntes',
            unidade: overrides.unit || 'Mil Reais',
            resultados: [
                {
                    classificacoes: [],
                    series: records.map(([id, name, value]) => ({
                        localidade: {
                            id,
                            nivel: {
                                id: level,
                                nome: levelName
                            },
                            nome: name
                        },
                        serie: {
                            [year]: value
                        }
                    }))
                }
            ]
        }
    ];
}

function makeStateResponse(records = STATE_RECORDS_2023, overrides) {
    return makeResponse('N3', 'Unidade da Federação', records, overrides);
}

function makeBrazilResponse(value = '10943345439', overrides) {
    return makeResponse('N1', 'Brasil', [['1', 'Brasil', value]], overrides);
}

function makePopulationStateResponse(records = POPULATION_RECORDS_2022, overrides = {}) {
    return makeResponse('N3', 'Unidade da Federação', records, {
        variable: '93',
        unit: 'Pessoas',
        year: '2022',
        ...overrides
    });
}

function makePopulationBrazilResponse(value = '203080756', overrides = {}) {
    return makeResponse('N1', 'Brasil', [['1', 'Brasil', value]], {
        variable: '93',
        unit: 'Pessoas',
        year: '2022',
        ...overrides
    });
}

test('parseMilReais normaliza valores numéricos do SIDRA', () => {
    assert.equal(IbgePib.parseMilReais('10943345439'), 10943345439);
    assert.equal(IbgePib.parseMilReais('1.234,50'), 1234.5);
    assert.throws(() => IbgePib.parseMilReais('...'), /Valor do PIB inválido/);
});

test('buildPibVerification aprova o retrato oficial de 2023', () => {
    const verification = IbgePib.buildPibVerification(
        makeStateResponse(),
        makeBrazilResponse()
    );

    assert.equal(verification.passed, true);
    assert.equal(verification.checks.stateValidation.receivedCount, 27);
    assert.equal(verification.checks.differenceMilReais, -2);
    assert.equal(verification.states[0].id, '35');
    assert.equal(verification.states[0].name, 'São Paulo');
});

test('validateStateDataset acusa UF ausente', () => {
    const recordsWithoutDistritoFederal = STATE_RECORDS_2023.filter(([id]) => id !== '53');
    const verification = IbgePib.buildPibVerification(
        makeStateResponse(recordsWithoutDistritoFederal),
        makeBrazilResponse()
    );

    assert.equal(verification.passed, false);
    assert.deepEqual(verification.checks.stateValidation.missingCodes, ['53']);
});

test('extractPibSeries rejeita metadados de variável incorreta', () => {
    assert.throws(
        () => IbgePib.extractPibSeries(makeStateResponse(STATE_RECORDS_2023, { variable: '543' }), 'N3'),
        /Variável inesperada/
    );
});

test('buildPopulationVerification aprova a população do Censo 2022', () => {
    const verification = IbgePib.buildPopulationVerification(
        makePopulationStateResponse(),
        makePopulationBrazilResponse()
    );

    assert.equal(verification.passed, true);
    assert.equal(verification.checks.stateValidation.receivedCount, 27);
    assert.equal(verification.checks.stateTotal, 203080756);
    assert.equal(verification.checks.difference, 1);
});

test('validateIdhmDataset valida cobertura e faixas do IDHM 2021', () => {
    const validation = IbgePib.validateIdhmDataset();

    assert.equal(validation.passed, true);
    assert.equal(validation.brazilValue, 0.766);
    assert.equal(IbgePib.IDHM_BY_UF['53'], 0.814);
    assert.equal(IbgePib.IDHM_BY_UF['35'], 0.805);
    assert.equal(IbgePib.IDHM_BY_UF['21'], 0.676);
    assert.equal(validation.categories['Muito alto'], 2);
    assert.equal(validation.categories.Alto, 17);
    assert.equal(validation.categories['Médio'], 8);
});

test('buildStateIndicatorsVerification cruza PIB, população e IDHM por UF', () => {
    const verification = IbgePib.buildStateIndicatorsVerification(
        makeStateResponse(),
        makeBrazilResponse(),
        makePopulationStateResponse(),
        makePopulationBrazilResponse()
    );

    assert.equal(verification.passed, true);
    assert.equal(verification.states.length, 27);

    const saoPaulo = verification.states[0];
    assert.equal(saoPaulo.id, '35');
    assert.equal(saoPaulo.pibMilReais, 3444814033);
    assert.equal(saoPaulo.population, 44411238);
    assert.equal(saoPaulo.idhm, 0.806);
    assert.equal(saoPaulo.idhmCategory, 'Muito alto');
    assert.ok(saoPaulo.pibPerCapita > 77000);
});
