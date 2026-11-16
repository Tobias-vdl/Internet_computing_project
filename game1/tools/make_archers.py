# Generates archer sprite sheets in the same layout as the Gem Rush lab
# (24x25 cells, 10 columns, 8 rows):
#   row 0 idleDown, 1 idleLeft, 2 idleUp, 3 idleRight,
#   row 4 moveDown, 5 moveLeft, 6 moveUp, 7 moveRight
import math
from PIL import Image

W, H = 24, 25
COLS, ROWS = 10, 8

K = (13, 14, 18)          # outline
S = (241, 201, 165)       # skin
S2 = (205, 160, 125)      # skin shadow
E = (30, 20, 18)          # eyes
T = (79, 107, 58)         # tunic
T2 = (56, 78, 40)         # tunic shadow
B = (90, 62, 38)          # belt
Y = (242, 193, 78)        # buckle
P = (64, 60, 74)          # trousers
P2 = (44, 42, 52)         # back trousers
D = (82, 56, 38)          # boots
D2 = (58, 40, 28)         # back boots
WB = (138, 90, 43)        # bow wood
WL = (186, 132, 74)       # bow grip
Z = (230, 226, 216)       # bow string
Q = (107, 74, 43)         # quiver
F = (224, 74, 58)         # fletching

TEAMS = {
    "blue": ((61, 123, 255), (36, 74, 168), (140, 178, 255)),
    "red":  ((228, 64, 64), (146, 34, 40), (255, 140, 128)),
}


class Frame:
    def __init__(self):
        self.g = [[None] * W for _ in range(H)]

    def px(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.g[y][x] = c

    def rect(self, x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.px(i, j, c)

    def clear(self, x, y):
        if 0 <= x < W and 0 <= y < H:
            self.g[y][x] = None

    def outline(self):
        out = [row[:] for row in self.g]
        for y in range(H):
            for x in range(W):
                if self.g[y][x] is not None:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H:
                        c = self.g[ny][nx]
                        if c is not None and c != Z:
                            out[y][x] = K
                            break
        self.g = out

    def flipped(self):
        f = Frame()
        f.g = [row[::-1] for row in self.g]
        return f


def front(team, bob=0, lift_l=0, lift_r=0, arm_l=0, arm_r=0, blink=False):
    c, cd, cl = team
    f = Frame()
    o = bob
    # Cape edges behind the body
    f.rect(7, 10 + o, 1, 7, cd)
    f.rect(16, 10 + o, 1, 7, cd)
    # Legs (a lifted leg has its boot raised)
    for x, lift in ((9, lift_l), (13, lift_r)):
        f.rect(x, 17 + o, 2, max(1, 21 - lift - (17 + o)), P)
        f.rect(x, 21 - lift, 2, 2, D)
    # Torso
    f.rect(8, 10 + o, 8, 7, T)
    f.rect(8, 10 + o, 1, 7, T2)
    f.rect(15, 10 + o, 1, 7, T2)
    f.rect(8, 16 + o, 8, 1, T2)
    f.rect(8, 15 + o, 8, 1, B)
    f.rect(11, 15 + o, 2, 1, Y)
    f.rect(9, 10 + o, 6, 1, c)
    # Arms
    for x, a in ((6, arm_l), (16, arm_r)):
        f.rect(x, 10 + o, 2, 1, c)
        f.rect(x, 11 + o + a, 2, 4, T)
        f.rect(x, 15 + o + a, 2, 1, S)
    # Bow in the left hand (viewer's right)
    by = o + arm_r
    f.rect(19, 10 + by, 1, 11, WB)
    for y in (8, 9, 21, 22):
        f.px(18, y + by, WB)
    f.px(18, 15 + by, WL)
    # Head with hood
    f.rect(8, 3 + o, 8, 7, c)
    f.clear(8, 3 + o)
    f.clear(15, 3 + o)
    f.rect(11, 2 + o, 2, 1, c)
    f.rect(9, 3 + o, 6, 1, cl)
    f.rect(9, 6 + o, 6, 4, S)
    f.rect(9, 6 + o, 6, 1, S2)
    if blink:
        f.rect(10, 8 + o, 1, 1, S2)
        f.rect(13, 8 + o, 1, 1, S2)
    else:
        f.px(10, 7 + o, E)
        f.px(13, 7 + o, E)
        f.px(10, 8 + o, E)
        f.px(13, 8 + o, E)
    f.outline()
    return f


def back(team, bob=0, lift_l=0, lift_r=0, arm_l=0, arm_r=0):
    c, cd, cl = team
    f = Frame()
    o = bob
    # Bow in the left hand (viewer's left when seen from behind)
    by = o + arm_l
    f.rect(4, 10 + by, 1, 11, WB)
    for y in (8, 9, 21, 22):
        f.px(5, y + by, WB)
    f.px(5, 15 + by, WL)
    # Legs
    for x, lift in ((9, lift_l), (13, lift_r)):
        f.rect(x, 17 + o, 2, max(1, 21 - lift - (17 + o)), P)
        f.rect(x, 21 - lift, 2, 2, D)
    # Cape covering the back
    f.rect(8, 10 + o, 8, 8, cd)
    f.rect(9, 10 + o, 6, 8, c)
    for x in (9, 11, 13):
        f.px(x, 18 + o, cd)
    # Arms
    for x, a in ((6, arm_l), (16, arm_r)):
        f.rect(x, 10 + o, 2, 2, c)
        f.rect(x, 12 + o + a, 2, 3, T)
        f.rect(x, 15 + o + a, 2, 1, S)
    # Head with hood seen from behind
    f.rect(8, 3 + o, 8, 7, c)
    f.clear(8, 3 + o)
    f.clear(15, 3 + o)
    f.rect(11, 2 + o, 2, 1, c)
    f.rect(9, 3 + o, 6, 1, cl)
    f.rect(10, 5 + o, 4, 4, cd)
    f.rect(11, 10 + o, 2, 2, c)
    # Quiver across the back with fletching over the shoulder
    for k in range(8):
        f.rect(14 - k // 2, 7 + k + o, 2, 1, Q)
    f.rect(14, 5 + o, 2, 2, F)
    f.px(16, 4 + o, F)
    f.px(13, 4 + o, F)
    f.outline()
    return f


def side_left(team, bob=0, k=0, arm=0, blink=False, flutter=0):
    c, cd, cl = team
    f = Frame()
    o = bob
    # Cape behind the body, fluttering
    f.rect(14, 10 + o, 2, 8, cd)
    f.px(16, 13 + o + flutter, cd)
    f.px(16, 16 + o - flutter, cd)
    # Quiver on the back
    f.rect(15, 8 + o, 2, 6, Q)
    f.rect(15, 6 + o, 1, 2, F)
    f.px(16, 5 + o, F)
    f.px(17, 6 + o, F)
    # Back leg (darker)
    bx = 12 + k
    f.rect(12, 17 + o, 2, 2, P2)
    f.rect(bx, 19 + o, 2, 2 - o, P2)
    f.rect(bx, 21, 2, 2, D2)
    f.px(bx - 1, 22, D2)
    # Torso
    f.rect(10, 10 + o, 5, 7, T)
    f.rect(14, 10 + o, 1, 7, T2)
    f.rect(10, 16 + o, 5, 1, T2)
    f.rect(10, 15 + o, 5, 1, B)
    f.px(10, 15 + o, Y)
    f.rect(10, 10 + o, 5, 1, c)
    # Front leg
    fx = 11 - k
    f.rect(11, 17 + o, 2, 2, P)
    f.rect(fx, 19 + o, 2, 2 - o, P)
    f.rect(fx, 21, 2, 2, D)
    f.px(fx - 1, 22, D)
    # Bow held in front of the body
    by = o + arm
    f.rect(7, 11 + by, 1, 9, WB)
    for y in (9, 10, 20, 21):
        f.px(8, y + by, WB)
    f.rect(9, 10 + by, 1, 11, Z)
    f.px(8, 15 + by, WL)
    # Front arm holding the bow
    f.rect(11, 11 + o, 2, 2, c)
    f.rect(10, 13 + o + arm, 2, 2, T)
    f.rect(9, 15 + o + arm, 2, 1, S)
    # Head with hood, facing left
    f.rect(9, 3 + o, 7, 7, c)
    f.clear(9, 3 + o)
    f.clear(15, 3 + o)
    f.rect(10, 2 + o, 3, 1, c)
    f.rect(10, 3 + o, 5, 1, cl)
    f.rect(16, 5 + o, 1, 3, c)
    f.rect(9, 6 + o, 3, 4, S)
    f.rect(9, 6 + o, 3, 1, S2)
    f.px(8, 8 + o, S)
    if blink:
        f.px(10, 8 + o, S2)
    else:
        f.px(10, 7 + o, E)
        f.px(10, 8 + o, E)
    f.outline()
    return f


def build(team):
    sheet = Image.new("RGBA", (W * COLS, H * ROWS), (0, 0, 0, 0))

    def put(frame, col, row):
        for y in range(H):
            for x in range(W):
                c = frame.g[y][x]
                if c is not None:
                    sheet.putpixel((col * W + x, row * H + y), c + (255,))

    # Idle: normal, breathing, blink
    idle_down = [front(team), front(team, bob=1), front(team, blink=True)]
    idle_left = [side_left(team), side_left(team, bob=1), side_left(team, blink=True)]
    idle_up = [back(team), back(team, bob=1), back(team)]
    for i in range(3):
        put(idle_down[i], i, 0)
        put(idle_left[i], i, 1)
        put(idle_up[i], i, 2)
        put(idle_left[i].flipped(), i, 3)

    # Walking: a 10-frame cycle
    for i in range(10):
        s = math.sin(2 * math.pi * i / 10)
        contact = abs(s) < 0.5
        bob = 1 if contact else 0
        lift_l = round(max(0.0, s) * 2)
        lift_r = round(max(0.0, -s) * 2)
        arm = round(s)
        put(front(team, bob=1 - bob, lift_l=lift_l, lift_r=lift_r, arm_l=-arm, arm_r=arm), i, 4)
        k = round(3 * s)
        sbob = 1 if abs(k) >= 2 else 0
        left = side_left(team, bob=sbob, k=k, arm=1 if i % 5 < 2 else 0, flutter=i % 2)
        put(left, i, 5)
        put(back(team, bob=1 - bob, lift_l=lift_l, lift_r=lift_r, arm_l=arm, arm_r=-arm), i, 6)
        put(left.flipped(), i, 7)
    return sheet


if __name__ == "__main__":
    import sys
    out = sys.argv[1]
    for name, team in TEAMS.items():
        build(team).save(f"{out}/archer_{name}.png")
        print("saved", name)
