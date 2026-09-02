import app as app_module
import sudoku_logic


def test_index_renders_game_page(client):
    response = client.get('/')

    assert response.status_code == 200
    assert b'Sudoku Game' in response.data
    assert b'/static/main.js' in response.data


def test_new_game_uses_default_clue_count_and_stores_game(client, monkeypatch):
    expected_puzzle = sudoku_logic.create_empty_board()
    expected_solution = sudoku_logic.create_empty_board()
    captured = {}

    def fake_generate_puzzle(clues):
        captured['clues'] = clues
        return expected_puzzle, expected_solution

    monkeypatch.setattr(app_module.sudoku_logic, 'generate_puzzle', fake_generate_puzzle)

    response = client.get('/new')

    assert response.status_code == 200
    assert response.get_json() == {'puzzle': expected_puzzle}
    assert captured['clues'] == 35
    assert app_module.CURRENT == {
        'puzzle': expected_puzzle,
        'solution': expected_solution,
    }


def test_new_game_accepts_a_custom_clue_count(client, monkeypatch):
    captured = {}

    def fake_generate_puzzle(clues):
        captured['clues'] = clues
        return [[0]], [[1]]

    monkeypatch.setattr(app_module.sudoku_logic, 'generate_puzzle', fake_generate_puzzle)

    response = client.get('/new?clues=50')

    assert response.status_code == 200
    assert captured['clues'] == 50


def test_check_requires_a_game_in_progress(client):
    response = client.post('/check', json={'board': sudoku_logic.create_empty_board()})

    assert response.status_code == 400
    assert response.get_json() == {'error': 'No game in progress'}


def test_check_returns_no_incorrect_cells_for_the_current_solution(client):
    _, solution = sudoku_logic.generate_puzzle(35)
    app_module.CURRENT['solution'] = solution

    response = client.post('/check', json={'board': solution})

    assert response.status_code == 200
    assert response.get_json() == {'incorrect': []}


def test_check_returns_coordinates_for_incorrect_cells(client):
    _, solution = sudoku_logic.generate_puzzle(35)
    app_module.CURRENT['solution'] = solution
    board = sudoku_logic.deep_copy(solution)
    board[0][0] = (solution[0][0] % sudoku_logic.SIZE) + 1

    response = client.post('/check', json={'board': board})

    assert response.status_code == 200
    assert response.get_json() == {'incorrect': [[0, 0]]}


def test_hint_returns_first_empty_cell_and_correct_value(client):
    puzzle, solution = sudoku_logic.generate_puzzle(35)
    app_module.CURRENT['puzzle'] = puzzle
    app_module.CURRENT['solution'] = solution
    board = sudoku_logic.deep_copy(puzzle)

    response = client.post('/hint', json={'board': board})
    hint = response.get_json()

    assert response.status_code == 200
    assert puzzle[hint['row']][hint['col']] == sudoku_logic.EMPTY
    assert hint['value'] == solution[hint['row']][hint['col']]


def test_hint_requires_a_game_in_progress(client):
    response = client.post('/hint', json={'board': sudoku_logic.create_empty_board()})

    assert response.status_code == 400
    assert response.get_json() == {'error': 'No game in progress'}