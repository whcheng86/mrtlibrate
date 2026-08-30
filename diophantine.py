primes = [8,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61]

#We want to find a diophantine in the form a x^6 + b y^11 = c that has
#solutions mod every prime < 67 and no solutions mod 67

def sixth_residues(p):
    residues = {0}
    for x in range(p):
        residues.add((x ** 6) % p)
    return sorted(residues)

def eleventh_residues(p):
    residues = {0}
    for x in range(p):
        residues.add((x ** 11) % p)
    return sorted(residues)

def check(p,a,b,c):
    eleventh = eleventh_residues(p)
    sixth = sixth_residues(p)
    #print(a, "x^6+", b, "y^11=", c, "mod", p)
    #print(sixth)
    #print(eleventh)
    total = {0}
    for x in sixth:
        for y in eleventh:
            if (a*x + b*y) % p == c % p:
                print(a, "*", x, " + ", b, "*", y, " = ", c, "=", c % p, "mod", p, "has a solution")
                print()
                return True
    return False


done = True

for a in range(31,32):
    for b in range(-26,-25):
        for c in range(2631,2632):
            done = True
            for p in range(2,67):
                if check(p,a,b,c) == False:
                    done = False
                    print(a, "x^6+", b, "y^11=", c, "has no solutions mod ", p)
                    break
            if done == True:
                if check(67,a,b,c) == False:
                    print(a, "x^6+", b, "y^11=", c, "has no solutions mod 67")
                    break
            else:
                print(a, "x^6+", b, "y^11=", c, "has a solution mod everything")
                pass
