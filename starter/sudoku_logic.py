import copy
import random

SIZE = 9
EMPTY = 0

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True

def count_solutions(board, limit=2):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                count = 0
                for candidate in range(1, SIZE + 1):
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        count += count_solutions(board, limit - count)
                        board[row][col] = EMPTY
                        if count >= limit:
                            return count
                return count
    return 1

def remove_cells(board, clues):
    removals_needed = max(0, SIZE * SIZE - clues)
    cells = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(cells)
    removed = 0

    for row, col in cells:
        if removed >= removals_needed:
            break
        value = board[row][col]
        if value == EMPTY:
            continue
        board[row][col] = EMPTY
        if count_solutions(board) == 1:
            removed += 1
        else:
            board[row][col] = value

def generate_puzzle(clues=35):
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    remove_cells(board, clues)
    puzzle = deep_copy(board)
    return puzzle, solution
