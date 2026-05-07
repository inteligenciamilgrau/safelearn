(function attachStateIndicators(global) {
    'use strict';

    const STATE_LEVEL = 'N3';
    const COUNTRY_LEVEL = 'N1';

    const EXPECTED_UF_CODES = Object.freeze([
        '11', '12', '13', '14', '15', '16', '17',
        '21', '22', '23', '24', '25', '26', '27', '28', '29',
        '31', '32', '33', '35',
        '41', '42', '43',
        '50', '51', '52', '53'
    ]);

    const PIB_CONFIG = Object.freeze({
        key: 'pib',
        year: '2023',
        table: '5938',
        variable: '37',
        variableName: 'Produto Interno Bruto a preços correntes',
        unit: 'Mil Reais',
        stateUrl: 'https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/2023/variaveis/37?localidades=N3%5Ball%5D',
        brazilUrl: 'https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/2023/variaveis/37?localidades=N1%5B1%5D',
        sourceLabel: 'IBGE/SIDRA - Tabela 5938, variável 37',
        sourcePage: 'https://sidra.ibge.gov.br/tabela/5938',
        totalTolerance: 10
    });

    const POPULATION_CONFIG = Object.freeze({
        key: 'population',
        year: '2022',
        table: '4714',
        variable: '93',
        variableName: 'População residente',
        unit: 'Pessoas',
        stateUrl: 'https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/2022/variaveis/93?localidades=N3%5Ball%5D',
        brazilUrl: 'https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/2022/variaveis/93?localidades=N1%5B1%5D',
        sourceLabel: 'IBGE/SIDRA - Tabela 4714, variável 93',
        sourcePage: 'https://sidra.ibge.gov.br/tabela/4714',
        totalTolerance: 0
    });

    const IDHM_CONFIG = Object.freeze({
        year: '2021',
        sourceLabel: 'PNUD Brasil/Ipea/FJP - Painel IDHM',
        sourcePage: 'https://www.undp.org/pt/brazil/desenvolvimento-humano/painel-idhm',
        brazilValue: 0.766
    });

    const IDHM_BY_UF = Object.freeze({
        '11': 0.700,
        '12': 0.710,
        '13': 0.700,
        '14': 0.699,
        '15': 0.690,
        '16': 0.688,
        '17': 0.731,
        '21': 0.676,
        '22': 0.690,
        '23': 0.734,
        '24': 0.728,
        '25': 0.698,
        '26': 0.719,
        '27': 0.684,
        '28': 0.702,
        '29': 0.691,
        '31': 0.774,
        '32': 0.771,
        '33': 0.762,
        '35': 0.806,
        '41': 0.769,
        '42': 0.792,
        '43': 0.771,
        '50': 0.742,
        '51': 0.736,
        '52': 0.737,
        '53': 0.814
    });

    function invariant(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    function parseSidraNumber(value, label = 'valor') {
        const rawValue = String(value ?? '').trim().replace(/\s/g, '');
        invariant(rawValue !== '', `${label} ausente na resposta do IBGE.`);

        const normalizedValue = rawValue.includes(',')
            ? rawValue.replace(/\./g, '').replace(',', '.')
            : rawValue;
        const parsedValue = Number(normalizedValue);

        invariant(Number.isFinite(parsedValue), `${label} inválido: ${value}`);
        return parsedValue;
    }

    function parseMilReais(value) {
        return parseSidraNumber(value, 'Valor do PIB');
    }

    function normalizeApiRoot(response) {
        if (Array.isArray(response)) {
            return response;
        }

        if (response && Array.isArray(response.value)) {
            return response.value;
        }

        throw new Error('Resposta do IBGE fora do formato esperado.');
    }

    function extractSidraSeries(response, config, expectedLevel) {
        const root = normalizeApiRoot(response);
        const variableBlock = root[0];

        invariant(variableBlock, 'Resposta do IBGE sem bloco de variável.');
        invariant(String(variableBlock.id) === config.variable, `Variável inesperada: ${variableBlock.id}`);
        invariant(variableBlock.unidade === config.unit, `Unidade inesperada: ${variableBlock.unidade}`);

        const series = (variableBlock.resultados || [])
            .flatMap((result) => result.series || []);

        invariant(series.length > 0, 'Resposta do IBGE sem séries de dados.');

        const records = series.map((item) => {
            const location = item.localidade || {};
            const level = location.nivel || {};
            const value = item.serie && item.serie[config.year];

            invariant(level.id === expectedLevel, `Nível territorial inesperado: ${level.id}`);
            invariant(location.id, 'Localidade sem código IBGE.');
            invariant(location.nome, `Localidade ${location.id} sem nome.`);

            return {
                id: String(location.id),
                name: location.nome,
                level: level.id,
                year: config.year,
                value: parseSidraNumber(value, config.variableName)
            };
        });

        return {
            table: config.table,
            variable: String(variableBlock.id),
            variableName: variableBlock.variavel,
            unit: variableBlock.unidade,
            year: config.year,
            level: expectedLevel,
            records
        };
    }

    function extractPibSeries(response, expectedLevel, year = PIB_CONFIG.year) {
        const dataset = extractSidraSeries(response, { ...PIB_CONFIG, year }, expectedLevel);
        return {
            ...dataset,
            records: dataset.records.map((record) => ({
                ...record,
                valueMilReais: record.value
            }))
        };
    }

    function validateStateRecords(records, valueField = 'value') {
        const expectedCodes = new Set(EXPECTED_UF_CODES);
        const seenCodes = new Set();
        const duplicatedCodes = [];

        records.forEach((record) => {
            if (seenCodes.has(record.id)) {
                duplicatedCodes.push(record.id);
            }
            seenCodes.add(record.id);
        });

        const missingCodes = EXPECTED_UF_CODES.filter((code) => !seenCodes.has(code));
        const unexpectedCodes = records
            .map((record) => record.id)
            .filter((code) => !expectedCodes.has(code));
        const nonPositiveCodes = records
            .filter((record) => !(record[valueField] > 0))
            .map((record) => record.id);

        return {
            expectedCount: EXPECTED_UF_CODES.length,
            receivedCount: records.length,
            missingCodes,
            unexpectedCodes,
            duplicatedCodes,
            nonPositiveCodes,
            passed: records.length === EXPECTED_UF_CODES.length
                && missingCodes.length === 0
                && unexpectedCodes.length === 0
                && duplicatedCodes.length === 0
                && nonPositiveCodes.length === 0
        };
    }

    function validateStateDataset(dataset) {
        return validateStateRecords(dataset.records, 'value');
    }

    function sumRecords(records, field = 'value') {
        return records.reduce((total, record) => total + record[field], 0);
    }

    function sumMilReais(records) {
        return sumRecords(records, records[0] && 'valueMilReais' in records[0] ? 'valueMilReais' : 'value');
    }

    function buildSidraVerification(stateResponse, brazilResponse, config) {
        const statesDataset = extractSidraSeries(stateResponse, config, STATE_LEVEL);
        const brazilDataset = extractSidraSeries(brazilResponse, config, COUNTRY_LEVEL);
        const stateValidation = validateStateDataset(statesDataset);

        invariant(brazilDataset.records.length === 1, 'Total Brasil deve ter uma única série.');
        invariant(brazilDataset.records[0].id === '1', `Código do Brasil inesperado: ${brazilDataset.records[0].id}`);

        const stateTotal = sumRecords(statesDataset.records);
        const brazilTotal = brazilDataset.records[0].value;
        const difference = stateTotal - brazilTotal;
        const absoluteDifference = Math.abs(difference);
        const totalCheckPassed = absoluteDifference <= config.totalTolerance;

        return {
            config,
            checkedAt: new Date().toISOString(),
            states: [...statesDataset.records],
            checks: {
                stateValidation,
                stateTotal,
                brazilTotal,
                difference,
                absoluteDifference,
                totalCheckPassed,
                metadataPassed: statesDataset.table === config.table
                    && statesDataset.variable === config.variable
                    && statesDataset.unit === config.unit
                    && statesDataset.year === config.year
            },
            passed: stateValidation.passed && totalCheckPassed
        };
    }

    function buildPibVerification(stateResponse, brazilResponse) {
        const verification = buildSidraVerification(stateResponse, brazilResponse, PIB_CONFIG);
        const states = verification.states
            .map((state) => ({
                ...state,
                valueMilReais: state.value
            }))
            .sort((a, b) => b.valueMilReais - a.valueMilReais);

        return {
            ...verification,
            states,
            checks: {
                ...verification.checks,
                stateTotalMilReais: verification.checks.stateTotal,
                brazilTotalMilReais: verification.checks.brazilTotal,
                differenceMilReais: verification.checks.difference,
                absoluteDifferenceMilReais: verification.checks.absoluteDifference
            }
        };
    }

    function buildPopulationVerification(stateResponse, brazilResponse) {
        return buildSidraVerification(stateResponse, brazilResponse, POPULATION_CONFIG);
    }

    function classifyIdhm(value) {
        if (value >= 0.8) {
            return 'Muito alto';
        }
        if (value >= 0.7) {
            return 'Alto';
        }
        if (value >= 0.6) {
            return 'Médio';
        }
        if (value >= 0.5) {
            return 'Baixo';
        }
        return 'Muito baixo';
    }

    function validateIdhmDataset(idhmByUf = IDHM_BY_UF) {
        const records = Object.entries(idhmByUf).map(([id, value]) => ({ id, value }));
        const stateValidation = validateStateRecords(records, 'value');
        const categories = records.reduce((acc, record) => {
            const category = classifyIdhm(record.value);
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});

        const outOfRangeCodes = records
            .filter((record) => record.value < 0 || record.value > 1)
            .map((record) => record.id);

        return {
            ...stateValidation,
            categories,
            outOfRangeCodes,
            brazilValue: IDHM_CONFIG.brazilValue,
            passed: stateValidation.passed
                && outOfRangeCodes.length === 0
                && IDHM_CONFIG.brazilValue === 0.766
                && categories['Muito alto'] === 2
                && categories.Alto === 17
                && categories.Médio === 8
        };
    }

    function buildStateIndicatorsVerification(pibStateResponse, pibBrazilResponse, populationStateResponse, populationBrazilResponse) {
        const pib = buildPibVerification(pibStateResponse, pibBrazilResponse);
        const population = buildPopulationVerification(populationStateResponse, populationBrazilResponse);
        const idhmValidation = validateIdhmDataset();
        const populationById = new Map(population.states.map((state) => [state.id, state]));

        const states = pib.states.map((state) => {
            const populationRecord = populationById.get(state.id);
            invariant(populationRecord, `População ausente para UF ${state.id}.`);

            const idhm = IDHM_BY_UF[state.id];
            invariant(typeof idhm === 'number', `IDHM ausente para UF ${state.id}.`);

            return {
                id: state.id,
                name: state.name,
                pibMilReais: state.valueMilReais,
                population: populationRecord.value,
                idhm,
                idhmCategory: classifyIdhm(idhm),
                pibPerCapita: (state.valueMilReais * 1000) / populationRecord.value
            };
        });

        return {
            checkedAt: new Date().toISOString(),
            sources: {
                pib: PIB_CONFIG,
                population: POPULATION_CONFIG,
                idhm: IDHM_CONFIG
            },
            states,
            checks: {
                pib: pib.checks,
                population: population.checks,
                idhm: idhmValidation
            },
            passed: pib.passed && population.passed && idhmValidation.passed
        };
    }

    async function fetchJson(fetchImpl, url) {
        const response = await fetchImpl(url, {
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Falha ao consultar IBGE (${response.status}).`);
        }

        return response.json();
    }

    async function fetchPibEstados2023(fetchImpl) {
        const runFetch = fetchImpl || (global.fetch && global.fetch.bind(global));
        invariant(typeof runFetch === 'function', 'Fetch API indisponível para consultar o IBGE.');

        const [stateResponse, brazilResponse] = await Promise.all([
            fetchJson(runFetch, PIB_CONFIG.stateUrl),
            fetchJson(runFetch, PIB_CONFIG.brazilUrl)
        ]);

        return buildPibVerification(stateResponse, brazilResponse);
    }

    async function fetchStateIndicators(fetchImpl) {
        const runFetch = fetchImpl || (global.fetch && global.fetch.bind(global));
        invariant(typeof runFetch === 'function', 'Fetch API indisponível para consultar o IBGE.');

        const [
            pibStateResponse,
            pibBrazilResponse,
            populationStateResponse,
            populationBrazilResponse
        ] = await Promise.all([
            fetchJson(runFetch, PIB_CONFIG.stateUrl),
            fetchJson(runFetch, PIB_CONFIG.brazilUrl),
            fetchJson(runFetch, POPULATION_CONFIG.stateUrl),
            fetchJson(runFetch, POPULATION_CONFIG.brazilUrl)
        ]);

        return buildStateIndicatorsVerification(
            pibStateResponse,
            pibBrazilResponse,
            populationStateResponse,
            populationBrazilResponse
        );
    }

    function formatCompactCurrencyFromMilReais(valueMilReais, locale = 'pt-BR') {
        const valueReais = valueMilReais * 1000;
        const absValue = Math.abs(valueReais);
        const formatter = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        if (absValue >= 1_000_000_000_000) {
            return `R$ ${formatter.format(valueReais / 1_000_000_000_000)} tri`;
        }

        if (absValue >= 1_000_000_000) {
            return `R$ ${formatter.format(valueReais / 1_000_000_000)} bi`;
        }

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
        }).format(valueReais);
    }

    function formatFullCurrencyFromMilReais(valueMilReais, locale = 'pt-BR') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
        }).format(valueMilReais * 1000);
    }

    function formatInteger(value, locale = 'pt-BR') {
        return new Intl.NumberFormat(locale, {
            maximumFractionDigits: 0
        }).format(value);
    }

    function formatIdhm(value, locale = 'pt-BR') {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        }).format(value);
    }

    function formatCurrency(value, locale = 'pt-BR') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
        }).format(value);
    }

    const api = {
        CONFIG: PIB_CONFIG,
        PIB_CONFIG,
        POPULATION_CONFIG,
        IDHM_CONFIG,
        IDHM_BY_UF,
        EXPECTED_UF_CODES,
        parseSidraNumber,
        parseMilReais,
        extractSidraSeries,
        extractPibSeries,
        validateStateRecords,
        validateStateDataset,
        validateIdhmDataset,
        classifyIdhm,
        sumRecords,
        sumMilReais,
        buildSidraVerification,
        buildPibVerification,
        buildPopulationVerification,
        buildStateIndicatorsVerification,
        fetchPibEstados2023,
        fetchStateIndicators,
        formatCompactCurrencyFromMilReais,
        formatFullCurrencyFromMilReais,
        formatInteger,
        formatIdhm,
        formatCurrency
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    global.StateIndicators = api;
    global.IbgePib = api;
})(typeof window !== 'undefined' ? window : globalThis);
