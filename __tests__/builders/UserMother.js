import { User } from '../../src/domain/User.js';

export class UserMother {
    static umUsuarioPadrao() {
        return new User(1, 'John Smith', 'standard@email.com', 'PADRAO');
    }

    static umUsuarioPremium() {
        return new User(2, 'Mary Jones', 'premium@email.com', 'PREMIUM');
    }
}
