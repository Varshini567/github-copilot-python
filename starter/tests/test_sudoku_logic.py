import sudoku_logic


def assert_valid_solution(board):
    expected = set(range(1, sudoku_logic.SIZE + 1))

    assert len(board) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in board)
    assert all(set(row) == expected for row in board)
    assert all(
        {board[row][column] for row in range(sudoku_logic.SIZE)} == expected
        for column in range(sudoku_logic.SIZE)
    )
    assert all(
        {
            board[row][column]
            for row in range(box_row, box_row + 3)
            for column in range(box_column, box_column + 3)
        }
        == expected
        for box_row in range(0, sudoku_logic.SIZE, 3)
        for box_column in range(0, sudoku_logic.SIZE, 3)
    )


def test_create_empty_board_has_expected_shape_and_values():
    board = sudoku_logic.create_empty_board()

    assert len(board) == sudoku_logic.SIZE
    assert all(row == [sudoku_logic.EMPTY] * sudoku_logic.SIZE for row in board)


def test_is_safe_rejects_row_column_and_box_conflicts():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 5

    assert not sudoku_logic.is_safe(board, 0, 1, 5)
    assert not sudoku_logic.is_safe(board, 1, 0, 5)
    assert not sudoku_logic.is_safe(board, 1, 1, 5)
    assert sudoku_logic.is_safe(board, 1, 1, 6)


def test_fill_board_produces_a_valid_solution():
    board = sudoku_logic.create_empty_board()

    assert sudoku_logic.fill_board(board) is True
    assert_valid_solution(board)


def test_count_solutions_stops_at_two_for_an_ambiguous_board():
    board = sudoku_logic.create_empty_board()

    assert sudoku_logic.count_solutions(board) == 2


def test_count_solutions_returns_one_for_a_complete_board():
    board = sudoku_logic.create_empty_board()
    sudoku_logic.fill_board(board)

    assert sudoku_logic.count_solutions(board) == 1


def test_deep_copy_does_not_share_nested_rows():
    original = [[1, 2], [3, 4]]
    copied = sudoku_logic.deep_copy(original)

    copied[0][0] = 9

    assert original == [[1, 2], [3, 4]]


def test_generate_puzzle_returns_valid_solution_and_requested_clues():
    clues = 35

    puzzle, solution = sudoku_logic.generate_puzzle(clues)

    assert_valid_solution(solution)
    assert len(puzzle) == sudoku_logic.SIZE
    assert all(len(row) == sudoku_logic.SIZE for row in puzzle)
    assert sum(cell != sudoku_logic.EMPTY for row in puzzle for cell in row) == clues
    assert all(
        puzzle[row][column] in (sudoku_logic.EMPTY, solution[row][column])
        for row in range(sudoku_logic.SIZE)
        for column in range(sudoku_logic.SIZE)
    )
    assert sudoku_logic.count_solutions(puzzle) == 1


def test_generate_puzzle_preserves_uniqueness_when_target_is_too_sparse():
    sparse_puzzle, sparse_solution = sudoku_logic.generate_puzzle(0)
    full_puzzle, another_solution = sudoku_logic.generate_puzzle(sudoku_logic.SIZE**2)

    assert sudoku_logic.count_solutions(sparse_puzzle) == 1
    assert any(cell != sudoku_logic.EMPTY for row in sparse_puzzle for cell in row)
    assert_valid_solution(sparse_solution)
    assert full_puzzle == another_solution
    assert sudoku_logic.count_solutions(full_puzzle) == 1