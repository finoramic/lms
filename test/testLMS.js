'use strict';
import expectThrow from './helpers/expectThrow';

const LMS = artifacts.require('../contracts/LMS.sol');

contract('LMS', function(accounts) {
    let lms;

    beforeEach(async function() {
        lms = await LMS.new('Lallan');
    });

    it('should have a default member', async function() {
        let memberCount = await lms.numMembers();
        assert.equal(memberCount, 1);
    });

    it('should have no books by default', async function() {
        let bookCount = await lms.numBooks();
        assert.equal(bookCount, 0);
    });

    describe('getOwnerDetails', function() {
        it('should provide owner details', async function() {
            let [name, account, status, timestamp] = await lms.getOwnerDetails();
            assert.equal(name, 'Lallan');
            assert.equal(account, web3.eth.coinbase);
            assert.equal(status.valueOf(), 0);
            assert.isAtMost(timestamp, Math.floor(Date.now() / 1000));
            assert.isAbove(timestamp, Math.floor(Date.now() / 1000) - 300);
        });
    });

    describe('addMember', function() {
        it('should not add an already added member', async function() {
            let memberCount = await lms.numMembers();
            assert.equal(memberCount.valueOf(), 1);
            await lms.addMember("John Doe", 0x0);
            await lms.addMember("John Doe", 0x0);
            memberCount = await lms.numMembers();
            assert.equal(memberCount.valueOf(), 2);
        });
        it('should not add the already added default member', async function() {
            await lms.addMember("Already added member", web3.eth.coinbase);
            let memberCount = await lms.numMembers();
            assert.equal(memberCount.valueOf(), 1);
        });
    });

    describe('getMemberDetails', function() {
        it('should provide member details', async function() {
            await lms.addMember("John Doe", 0x0);
            let [name, account, status, timestamp] = await lms.getMemberDetails(0x0);
            assert.equal(name, 'John Doe');
            assert.equal(account, 0x0);
            assert.equal(status.valueOf(), 0);
            assert.isAtMost(timestamp, Math.floor(Date.now() / 1000));
            assert.isAbove(timestamp, Math.floor(Date.now() / 1000) - 300);
        });
    });

    describe('removeMember', function() {
        it('should do nothing for non-existent members', async function() {
            await lms.removeMember(0x0);
        });
        it('should deactivate a member', async function() {
            await lms.removeMember(web3.eth.coinbase);
            let [name, account, status] = await lms.getOwnerDetails();
            assert.equal(name, 'Lallan');
            assert.equal(account, web3.eth.coinbase);
            assert.equal(status.valueOf(), 1);
        });
    });

    describe('addBook', function() {
        it('should add a book with the provided details', async function() {
            await lms.addBook("1984", "Orwell", "Classic Publishers");
            let bookCount = await lms.numBooks();
            assert.equal(bookCount, 1);
            let book = await lms.getBook(1);
            let bookAttr = book.split(';');
            assert.equal(bookAttr[1], '1984');
            assert.equal(bookAttr[2], 'Orwell');
            assert.equal(bookAttr[3], 'Classic Publishers');
            assert.equal('0x' + bookAttr[4], web3.eth.coinbase);
            assert.equal('0x' + bookAttr[5], 0x0);
            assert.equal(bookAttr[6], '0');
            assert.isAtMost(bookAttr[7], Math.floor(Date.now() / 1000));
            assert.isAbove(bookAttr[7], Math.floor(Date.now() / 1000) - 300);
            assert.equal(bookAttr[8], '0');
            assert.equal(bookAttr[9], '0');
        });
        it('should add multiple books', async function() {
            await lms.addMember('another account', accounts[1]);
            await lms.addBook('from', 'another', 'account', {from: accounts[1]});
            let info = [
                {title: 't1', author: 'a1', publisher: 'p1'},
                {title: 't2', author: 'a2', publisher: 'p2'},
                {title: 't3', author: 'a3', publisher: 'p3'}
            ]
            for (let i = 0; i < 3; i++) {
                await lms.addBook(info[i].title, info[i].author, info[i].publisher);
            }
            let bookCount = await lms.numBooks();
            assert.equal(bookCount.valueOf(), 4);
            let [books, count] = await lms.getMyBooks();
            console.log(books);
            assert.equal(count.valueOf(), 3);
            books = books.split('|');
            for (let i = 0; i < count; i++) {
                let bookAttr = books[i].split(';');
                assert.equal(bookAttr[1], info[i].title);
                assert.equal(bookAttr[2], info[i].author);
                assert.equal(bookAttr[3], info[i].publisher);
                assert.equal('0x' + bookAttr[4], web3.eth.coinbase);
                assert.equal('0x' + bookAttr[5], 0x0);
                assert.equal(bookAttr[6], '0');
                assert.isAtMost(bookAttr[7], Math.floor(Date.now() / 1000));
                assert.isAbove(bookAttr[7], Math.floor(Date.now() / 1000) - 300);
                assert.equal(bookAttr[8], '0');
                assert.equal(bookAttr[9], '0');
            }
        });
        it('should not allow non-members to add a book', async function() {
            await lms.removeMember(web3.eth.coinbase);
            await expectThrow(lms.addBook("t", "a", "p"));
            await expectThrow(lms.addBook("t", "a", "p", {from: accounts[1]}));
        });
    });

    describe('getAllBooks', function() {
        it('should return all books, irrespective of who owns them', async function() {
            await lms.addMember('Other member', accounts[1]);
            await lms.addMember('Another member', accounts[2]);
            let info = [
                {title: 't1', author: 'a1', publisher: 'p1'},
                {title: 't2', author: 'a2', publisher: 'p2'},
                {title: 't3', author: 'a3', publisher: 'p3'}
            ]
            for (let i = 0; i < 3; i++) {
                await lms.addBook(info[i].title, info[i].author, info[i].publisher, {from: accounts[i]});
            }
            let bookCount = await lms.numBooks();
            assert.equal(bookCount.valueOf(), 3);
            let [books, count] = await lms.getAllBooks();
            assert.equal(count.valueOf(), 3);
            books = books.split('|');
            for (let i = 0; i < count; i++) {
                let bookAttr = books[i].split(';');
                assert.equal(bookAttr[1], info[i].title);
                assert.equal(bookAttr[2], info[i].author);
                assert.equal(bookAttr[3], info[i].publisher);
                assert.equal('0x' + bookAttr[4], accounts[i]);
                assert.equal('0x' + bookAttr[5], 0x0);
                assert.equal(bookAttr[6], '0');
                assert.isAtMost(bookAttr[7], Math.floor(Date.now() / 1000));
                assert.isAbove(bookAttr[7], Math.floor(Date.now() / 1000) - 300);
                assert.equal(bookAttr[8], '0');
                assert.equal(bookAttr[9], '0');
            }
        });
    });

    describe('borrowBook', function() {
        it('should set the borrower, issue date and state', async function() {
            await lms.addBook("1984", "Orwell", "Classic Publishers");
            await lms.borrowBook(1);

            let book = await lms.getBook(1);
            console.log(book)
            let bookAttr = book.split(';');

            // Changed attributes
            assert.equal('0x' + bookAttr[5], web3.eth.coinbase);
            assert.equal(bookAttr[6], 1);
            assert.isAtMost(bookAttr[8], Math.floor(Date.now() / 1000));
            assert.isAbove(bookAttr[8], Math.floor(Date.now() / 1000) - 300);

            // Test against regression
            assert.equal(bookAttr[1], '1984');
            assert.equal(bookAttr[2], 'Orwell');
            assert.equal(bookAttr[3], 'Classic Publishers');
            assert.equal('0x' + bookAttr[4], web3.eth.coinbase);
            assert.isAtMost(bookAttr[7], Math.floor(Date.now() / 1000));
            assert.isAbove(bookAttr[7], Math.floor(Date.now() / 1000) - 300);
            assert.equal(bookAttr[9], '0');
        });
        it('should not allow borrowing books that are already borrowed', async function() {
            await lms.addBook('t', 'a', 'p');
            await lms.borrowBook(1);
            await expectThrow(lms.borrowBook(1));
        });
        it("should not allow borrowing books that don't exist", async function() {
            await expectThrow(lms.borrowBook(1));
        });
    });

    describe('returnBook', function() {
        it("should not allow returning books that don't exist", async function() {
            await expectThrow(lms.returnBook(1));
        });
        it('should not allow returning books that have not been issued', async function() {
            await lms.addBook('t', 'a', 'p');
            await expectThrow(lms.returnBook(1));
        });
        it('should reset the borrower, issue date and state', async function() {
            await lms.addBook('t', 'a', 'p');
            let orig = await lms.getBook(1);
            await lms.borrowBook(1);
            await lms.returnBook(1);
            let book = await lms.getBook(1);
            assert.equal(book, orig);
        });
        it('should allow only the book owner to return the book', async function() {
            // Add a member with a book
            await lms.addMember('Other', accounts[1]);
            await lms.addBook('t', 'a', 'p', {from: accounts[1]});
            // Default member borrows the book
            await lms.borrowBook(1);
            // Default member tries to return the book
            await expectThrow(lms.returnBook(1));
            // Book owner successfully returns the book
            await lms.returnBook(1, {from: accounts[1]});
        });
    });
});
